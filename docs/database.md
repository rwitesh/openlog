# System Architecture: Database & Local Storage

This document outlines how data is structured, stored, and managed in OpenLog. It focuses on systems design, data flow, and storage invariants rather than transient code details.

---

## 1. Core Principles

OpenLog is a **local-first, personal journaling application**. All user data lives exclusively on the user's physical device. The database layer is designed around four key requirements:

1. **Instant Cold Boots & Zero-Lag Feeds:** Query latency must remain sub-millisecond even after years of daily journaling (10,000+ entries).
2. **Durability & Crash Safety:** App terminations, power cuts, or low-memory kills must never corrupt the journal or leave settings in a partial state.
3. **Data Portability:** Binary media (images, audio notes) and database records must be resilient to operating system upgrades (such as iOS sandbox container migration).
4. **Zero Cloud Dependencies:** Full-text search, indexing, calendar aggregations, and settings management run entirely embedded via SQLite.

---

## 2. File System Layout

On both iOS and Android, OpenLog isolates data into two complementary storage locations inside the app's sandboxed document directory:

```text
<App Documents Directory>/
├── SQLite/
│   ├── app.db          # Main SQLite database file (B-Tree schema and rows)
│   ├── app.db-wal      # Write-Ahead Log (committed write transactions)
│   └── app.db-shm      # Shared memory index for WAL concurrency
└── media/              # Durable binary asset directory
    ├── 1724900123-abc.jpg
    ├── 1724900456-def.m4a
    └── ...
```

* **Why separate database and media?** SQLite is highly optimized for structured text, numerical indices, and relational queries. Large binary blobs (photos and audio recordings) are stored directly on the filesystem to keep database pages small and B-Tree traversals fast.
* **OS Backup Compliance:** The `Documents` directory is included in standard system backups (iCloud Backup on iOS, Auto Backup on Android), protecting user data across device transfers.

---

## 3. Data Model & Entities

The database consists of three primary structures: **Timeline Entries**, an **Automated Search Mirror**, and **User Settings**.

```
┌─────────────────────────────────────────────────────────────┐
│                           entries                           │
│  (id, created_at, updated_at, text, images, audios, ...)    │
└──────────────┬───────────────────────────────▲──────────────┘
               │ Triggers                      │ Reads
               │ (Insert / Update / Delete)    │ (Content Joins)
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                         entries_fts                         │
│       (FTS5 Virtual Table — Tokenized Text & Locations)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                          settings                           │
│                  (key, value — Key/Value Store)             │
└─────────────────────────────────────────────────────────────┘
```

---

### A. The `entries` Table (Core Timeline)

Stores every journal entry created by the user.

| Column | Type | Description | Design Rationale |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | Unique entry identifier (UUID or timestamp-rand). | Uses client-generated IDs for deterministic referencing across stores and backups. |
| `created_at` | `INTEGER NOT NULL` | Creation timestamp in Unix milliseconds. | Leading column for chronological timeline feeds and calendar ranges. |
| `updated_at` | `INTEGER NOT NULL` | Last modified timestamp in Unix milliseconds. | Used for sync and conflict tracking. |
| `text` | `TEXT` | The body text of the journal entry. | Plaintext entry content. Indexed by full-text search. |
| `images` | `TEXT` | JSON-encoded array of media filenames (e.g. `["photo1.jpg"]`). | Colocated with entry row for zero-join retrieval; references portable relative file paths. |
| `audios` | `TEXT` | JSON-encoded array of voice note filenames (e.g. `["audio1.m4a"]`). | Colocated with entry row for zero-join retrieval; references portable relative file paths. |
| `latitude` | `REAL` | Reverse-geocoded GPS latitude. | Stored as floating point for spatial lookups or future mapping. |
| `longitude` | `REAL` | Reverse-geocoded GPS longitude. | Stored as floating point for spatial lookups or future mapping. |
| `location_name` | `TEXT` | Human-readable place name (e.g. "Tokyo, Japan"). | Searchable text descriptor for entry location. |

#### Storage Decision: Colocated JSON vs. Normalization
Rather than creating an auxiliary `entry_media` table requiring foreign keys and multi-table joins, media paths are stored directly on the entry row as JSON strings. Because entries and their media attachments are always created, read, updated, and deleted as a single unit, colocation provides maximum read performance with zero join overhead.

---

### B. The `entries_fts` Virtual Table (Full-Text Search Mirror)

OpenLog features offline search across all journal text and location names.

* **External Content Architecture:** `entries_fts` is configured as an FTS5 external content table pointing to `entries` (`content='entries', content_rowid='rowid'`). This means FTS5 does **not** duplicate the text data; it only maintains an inverted index of token offsets.
* **Zero App-Level Synchronization:** SQLite triggers (`AFTER INSERT`, `AFTER UPDATE`, `AFTER DELETE`) automatically update the search index whenever entries are written or removed. The application layer never manually updates search indices.
* **Safe Prefix Searching:** Search inputs are tokenized into safe quoted prefix phrases (`"tokyo"*`), preventing punctuation or query operators from triggering search syntax errors.
* **Match Snippet Highlighting:** Highlights use non-printable ASCII control characters (`\u0001` and `\u0002`) within SQLite's native `snippet()` function. This prevents collisions with user text, Markdown formatting, or HTML tags.

---

### C. The `settings` Table (Preferences & State)

A lightweight key-value store (`key TEXT PRIMARY KEY, value TEXT`) for application state:
* **Appearance & Theme:** Selected theme mode (light/dark/system), accent color, font family, text size.
* **Behavior & Security:** Biometric lock status, timeline density, display toggles (show location, show timestamp).
* **Onboarding & Profile:** Onboarding completion status and local display name.

On application startup, all settings are loaded in a single query (`SELECT key, value FROM settings`) to hydrate the app theme before the splash screen hides. Multi-key updates (such as theme resets) are executed within atomic database transactions to ensure consistent state.

---

## 4. Concurrency, Reliability & Crash Safety

### Write-Ahead Logging (WAL)
The database operates in `WAL` journal mode with `PRAGMA synchronous = NORMAL`.
* **Readers Never Block Writers:** Timeline scrolling and background search queries read from the main database file without blocking or waiting for user write operations.
* **Writers Never Block Readers:** Writing a new entry appends sequentially to the WAL log without interfering with active read operations.
* **Crash Resilience:** In `WAL` mode with `NORMAL` synchronization, SQLite commits are durable and atomic across OS terminations or battery loss. Even in an abrupt shutdown, data corruption is physically impossible.

### Busy Timeout & Connection Serialization
* **`PRAGMA busy_timeout = 5000`:** If temporary file-system contention occurs (such as during system backup or file sync), SQLite pauses and retries for up to 5 seconds before reporting a lock error.
* **Thread Serialization:** In JavaScript, database access is serialized via a lightweight promise queue (`withLock`), preventing native race conditions across React Native fast-refresh cycles.

---

## 5. Query Patterns & Indexing

### Timeline Feeds (Deterministic Compound Cursor)
Timeline entries are paginated using a composite index:
```sql
CREATE INDEX idx_entries_created_at_id ON entries (created_at DESC, id DESC);
```
* **Compound Cursor Pagination:** The query uses row-value comparison `(created_at, id) < (cursorTimestamp, cursorId)`.
* **Zero Row Skipping:** If two entries share the exact same millisecond timestamp, the secondary `id` comparator ensures every entry appears in strict order without duplication or skipped records across page boundaries.

### Calendar Active-Day Scans (Covering Index)
When opening the calendar picker to see which days have entries:
```sql
SELECT created_at FROM entries WHERE created_at >= ? AND created_at < ?;
```
Because `created_at` is the leading column of `idx_entries_created_at_id`, SQLite fulfills this query entirely within the index tree (a **Covering Index Scan**). The main table data pages are never accessed, allowing months of timestamps to be scanned in <0.05ms.

---

## 6. Media Lifecycle & Path Portability

A common point of failure in mobile database design is storing absolute filesystem paths. On iOS, the sandbox container directory path changes across application updates (`/Containers/Data/Application/<UUID>/...`).

OpenLog ensures media durability through portable path resolution:
1. **At Rest:** Database records store only the relative filename (e.g. `img-1724.jpg`).
2. **In Memory:** When database rows are read into memory (`toEntry`), a resolver dynamically prepends the device's current, active document directory URI.
3. **On Deletion:** When an entry is deleted from SQLite, the query extracts associated media filenames and schedules their removal from disk, preventing orphaned storage leaks.
4. **On Backup & Restore:** Archives package the database JSON alongside relative media files, ensuring backups can be restored on any device or operating system seamlessly.

---

## 7. Schema Evolution & Versioning

OpenLog uses SQLite's built-in `PRAGMA user_version` to track schema revisions.
* On initial app launch, baseline tables and indices are created within an atomic transaction, setting `user_version = 1`.
* Future feature additions (e.g. tags, entry favorites) inspect `user_version` and execute structured, incremental migration steps. Existing user data is preserved without requiring table rebuilds or app resets.
