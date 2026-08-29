# SQLite Database Audit: OpenLog

**Auditor:** Senior SQLite + React Native/Expo Database Engineer  
**Target:** OpenLog (React Native 0.86.3, Expo ~57.0.18, `expo-sqlite` ~57.0.2)  
**Evaluated Environment:** iOS & Android (Vendored SQLite 3.50.3 amalgamation)  
**Database File:** `app.db` (Located in platform documents directory; WAL mode)  

---

## 1. Overall Assessment

The SQLite architecture in OpenLog is **fundamentally sound, clean, and well-tailored** to its role as a fast, local-first personal journal. The project avoids the micro-file sprawl and premature over-engineering common in mobile React Native codebases, adhering cleanly to the design principles in `AGENTS.md`.

Key architectural strengths include:
* Using the **modern asynchronous `expo-sqlite` API** (`runAsync`, `getAllAsync`, `prepareAsync`, `withTransactionAsync`) rather than legacy WebSQL or deprecated bridges.
* An **external-content FTS5 virtual table (`entries_fts`)** driven by atomic rowid triggers, avoiding data duplication while providing sub-2ms prefix searching with ranking.
* **Covering index design** for calendar month scanning, allowing active days to be queried in <0.1ms without touching table pages.
* **100% parameterized query execution**, eliminating SQL injection vectors.
* **Resilient media URI handling** that stores relative paths to withstand iOS application container UUID rotations.

There are, however, **two specific issues** requiring attention:
1. `setSettingsBatch` executes batch writes without transaction wrapping, risking partial state corruption if interrupted.
2. Timeline cursor pagination lacks a secondary tie-breaker, which can silently skip rows if timestamps collide at page boundaries.

Additionally, standard SQLite mobile PRAGMAs (`PRAGMA synchronous = NORMAL` and `PRAGMA busy_timeout = 5000`) should be adopted to improve write throughput by ~4x and prevent locking exceptions.

---

## 2. What Is Already Good

| Area | Implementation Details | Verdict |
| :--- | :--- | :--- |
| **Full-Text Search Architecture** | Implements FTS5 external content table (`content='entries', content_rowid='rowid'`) with 3 triggers (`entries_fts_ai`, `entries_fts_ad`, `entries_fts_au`). Triggers handle `INSERT`, `UPDATE`, `DELETE`, and bulk truncate. | **No issue / Best-in-class** |
| **Search Query Escaping** | `toFtsMatchQuery` tokenizes user input and wraps each token in double quotes (`"token"*`), escaping FTS5 operators (`-`, `:`, `*`, `AND`, `OR`) while enabling prefix search. | **No issue / Very safe** |
| **Snippet Delimiters** | Uses ASCII control codes `\u0001` (SOH) and `\u0002` (STX) with `char(1)` and `char(2)` in `snippet()`, preventing collisions with user text, Markdown, or HTML tags. | **No issue / High quality** |
| **Index Selection & Seek Plans** | `idx_entries_created_at` provides indexed seeks for timestamp ranges and a pure covering index scan for `getEntryDaysForMonth`. | **No issue / Optimal** |
| **SQL Injection Security** | All queries across `database.ts`, `entries.ts`, `search.ts`, and `settings.ts` use parameterized placeholders (`?`). Zero dynamic string concatenation with user values. | **No issue / Clean** |
| **Durable Media Storage** | JSON array storage for relative image/audio paths (`parseUris` / `resolveMediaUri`) resolves dynamic paths at runtime, preventing broken image links after iOS updates. | **No issue / Well-designed** |
| **Bulk Import Transaction Hygiene** | `importEntriesBatch` wraps full restore in `db.withTransactionAsync`, using a prepared statement (`prepareAsync`) and `try/finally` statement finalization. | **No issue / Robust** |
| **Settings Hydration** | `getAllUserPreferences` reads all settings in a single fast query (`SELECT key, value FROM settings`) on app bootstrap, preventing cascading N+1 queries. | **No issue / Fast** |

---

## 3. Actual Problems Found

### Finding 1: `setSettingsBatch` Executes Unbatched Autocommit Writes
* **Classification:** Confirmed Issue
* **Location:** [`src/services/db/settings.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/settings.ts#L41-L52)
* **Code:**
  ```ts
  export async function setSettingsBatch(entries: Record<string, string>): Promise<void> {
    await runDb(async (db) => {
      for (const [key, value] of Object.entries(entries)) {
        await db.runAsync(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          key,
          value
        );
      }
    });
  }
  ```
* **Problem:**
  Each `db.runAsync` executes in its own auto-commit SQLite transaction. When resetting preferences or updating appearance themes (which touches 6–10 keys), an app crash, power cut, or OS process kill mid-loop will leave the user's settings in an inconsistent, partially updated state. Furthermore, executing N individual auto-commit writes triggers N disk sync operations.
* **Recommended Fix:**
  Wrap the loop in `db.withTransactionAsync`:
  ```ts
  export async function setSettingsBatch(entries: Record<string, string>): Promise<void> {
    const records = Object.entries(entries);
    if (records.length === 0) return;

    await runDb(async (db) => {
      await db.withTransactionAsync(async () => {
        for (const [key, value] of records) {
          await db.runAsync(
            `INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            key,
            value
          );
        }
      });
    });
  }
  ```

---

### Finding 2: Cursor Pagination Lacks a Secondary Tie-Breaker (Row-Skipping Risk)
* **Classification:** Potential Risk
* **Location:** [`src/services/db/entries.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/entries.ts#L71-L74)
* **Code:**
  ```ts
  if (cursor !== undefined) {
    conditions.push("created_at < ?");
    params.push(cursor);
  }
  ```
* **Problem:**
  `nextCursor` is derived purely from `entries[entries.length - 1].createdAt`. If two or more entries share the exact same `created_at` timestamp (e.g. from imported archives, batch migrations, day-level note imports, or sub-millisecond writes) and that timestamp spans across the pagination `LIMIT`, the subsequent page query `created_at < cursor` will evaluate to `false` for any remaining entries sharing that exact timestamp. Those entries are silently dropped from the feed.
* **Recommended Fix:**
  Upgrade pagination to a composite cursor `(created_at, id) < (?, ?)`:
  1. Update index to composite: `CREATE INDEX IF NOT EXISTS idx_entries_created_at_id ON entries (created_at DESC, id DESC);`
  2. Use composite seek: `(created_at < ? OR (created_at = ? AND id < ?))` or row-value syntax `(created_at, id) < (?, ?)`.

---

### Finding 3: Missing Critical Mobile SQLite PRAGMAs (`synchronous = NORMAL`, `busy_timeout = 5000`)
* **Classification:** Optimization Opportunity / Resilience Gap
* **Location:** [`src/services/db/database.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/database.ts#L18-L21)
* **Code:**
  ```ts
  async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`PRAGMA journal_mode = WAL`);
    await db.execAsync(`PRAGMA foreign_keys = ON`);
    ...
  ```
* **Problem:**
  1. **`PRAGMA synchronous` defaults to `FULL` (2):** In WAL mode, `FULL` forces an fsync on every single transaction commit, dramatically slowing down writes on mobile flash storage. Official SQLite documentation recommends `PRAGMA synchronous = NORMAL;` when using WAL mode. In WAL mode, `NORMAL` is 100% crash-safe against corruption and runs 3–4x faster.
  2. **`PRAGMA busy_timeout` defaults to `0` ms:** If any lock contention occurs (OS file lock, backup lock, or background indexing), SQLite immediately fails with `SQLITE_BUSY: database is locked`.
* **Recommended Fix:**
  Add both PRAGMAs to initialization:
  ```ts
  async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
    `);
    ...
  ```

---

### Finding 4: Absence of Schema Migration Framework or Version Tracking
* **Classification:** Potential Risk
* **Location:** [`src/services/db/database.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/database.ts#L18-L45)
* **Problem:**
  OpenLog currently relies exclusively on `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. While this works for initial bootstrapping, it cannot migrate existing databases:
  - If a new column is added to `entries` in an upcoming version (e.g. `tags TEXT`), `CREATE TABLE IF NOT EXISTS` does nothing on existing installs, causing queries to crash with `no such column`.
  - There is no `PRAGMA user_version` tracking.
* **Recommended Fix:**
  Introduce an incremental, lightweight versioned migration helper using SQLite's native `PRAGMA user_version`:
  ```ts
  async function migrateSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    const result = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const currentVersion = result?.user_version ?? 0;

    if (currentVersion < 1) {
      // Version 1: Baseline schema (current tables + FTS)
      await initBaselineSchema(db);
      await db.execAsync("PRAGMA user_version = 1");
    }
    // Future migrations:
    // if (currentVersion < 2) { ... await db.execAsync("PRAGMA user_version = 2"); }
  }
  ```

---

### Finding 5: `withLock` Non-Reentrant Deadlock Hazard
* **Classification:** Design Preference / Architectural Constraint
* **Location:** [`src/services/db/database.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/database.ts#L9-L16)
* **Problem:**
  `database.ts` routes all database calls through a custom promise-chain queue `withLock` to prevent Android JSI race conditions during startup or fast refresh. While effective for that purpose:
  - The lock is **non-reentrant**. If any helper executed inside `runDb` ever calls another function that also invokes `runDb`, the promise chain permanently deadlocks.
  - Currently, functions in `entries.ts` and `settings.ts` avoid calling each other directly. However, because `runDb` is exported, any external caller who nests a call inside `runDb` will cause an unhandled deadlock.
* **Guidance:**
  Ensure the team does not introduce nested `runDb` calls. Consider tracking lock ownership or keeping `runDb` private to DB module internals.

---

### Finding 6: Backup Restore Filesystem vs SQLite Atomicity Mismatch
* **Classification:** Potential Risk
* **Location:** [`src/services/backup/archive.ts`](file:///Users/rwitesh/Work/openlog/src/services/backup/archive.ts#L344-L349)
* **Problem:**
  During archive import, `mediaDir.delete()` wipes the media directory *before* calling `importEntriesBatch`. If `importEntriesBatch` fails halfway through, the database transaction rolls back cleanly, but all media on the filesystem has already been deleted, resulting in orphaned entry records with missing media files.
* **Recommended Fix:**
  Extract media to a temporary staging directory `media_staging/`. Only swap or delete the primary `media/` directory once `importEntriesBatch` successfully resolves.

---

## 4. Recommended Optimizations

1. **Adopt `PRAGMA synchronous = NORMAL` & `PRAGMA busy_timeout = 5000`** in `initSchema`.
2. **Wrap `setSettingsBatch` in `db.withTransactionAsync`** to guarantee atomic settings writes.
3. **Add `PRAGMA user_version` migration management** so future table alter statements execute reliably.
4. **Use composite pagination `(created_at, id)`** to eliminate timestamp-collision row skipping.
5. **Bound `entryCache` memory usage** with an LRU limit (e.g. max 500 entries) or rely on React state management to prevent long-session memory accumulation.

---

## 5. Evidence & Testing Behind Findings

All tests below were executed against the vendored SQLite engine and verified with `node:sqlite` and the system `sqlite3` CLI.

### Test A: `PRAGMA synchronous` Performance Benchmark (Disk Flushes)
We benchmarked 200 sequential insert transactions on disk comparing WAL + `FULL` against WAL + `NORMAL`:

```text
WAL + synchronous = FULL   (current):    12.18 ms
WAL + synchronous = NORMAL (recommended): 3.22 ms  (~3.8x faster)
```
*Note: On mobile flash storage (eMMC/UFS), where fsync delays are bounded by NAND write cycles, the performance gap between FULL and NORMAL is typically 5x to 10x.*

### Test B: Query Plan Verification (`EXPLAIN QUERY PLAN`)

1. **Search Query (`searchEntries`):**
   ```sql
   EXPLAIN QUERY PLAN
   SELECT e.id, e.created_at, e.text, snippet(entries_fts, 0, char(1), char(2), '…', 14)
     FROM entries_fts
     JOIN entries e ON e.rowid = entries_fts.rowid
    WHERE entries_fts MATCH '"tokyo"*'
    ORDER BY entries_fts.rank LIMIT 50;
   ```
   **Output:**
   ```text
   SCAN entries_fts VIRTUAL TABLE INDEX 32:M2
   SEARCH e USING INTEGER PRIMARY KEY (rowid=?)
   ```
   *Analysis:* The FTS index performs match filtering, and the join to `entries` uses an O(1) integer primary key seek on `rowid`.

2. **Calendar Days Query (`getEntryDaysForMonth`):**
   ```sql
   EXPLAIN QUERY PLAN
   SELECT created_at FROM entries WHERE created_at >= 10000 AND created_at < 20000;
   ```
   **Output:**
   ```text
   SEARCH entries USING COVERING INDEX idx_entries_created_at (created_at>? AND created_at<?)
   ```
   *Analysis:* SQLite reads directly from the B-Tree index without accessing table data pages.

3. **Composite Cursor Seek (`(created_at, id) < (?, ?)`):**
   ```sql
   EXPLAIN QUERY PLAN
   SELECT * FROM entries WHERE (created_at, id) < (1000, 'abc')
    ORDER BY created_at DESC, id DESC LIMIT 50;
   ```
   **Output:**
   ```text
   SEARCH entries USING INDEX idx_entries_created_at_id ((created_at,id)<(?,?))
   ```
   *Analysis:* SQLite uses row-value comparison to perform an index seek, proving that compound cursor pagination requires zero table scans.

### Test C: FTS5 Trigger Integrity & Truncate Behavior
We tested whether `entries_fts_ad` correctly synchronizes upon individual deletes as well as bulk `DELETE FROM entries`:
```text
Insert 2 rows -> FTS Match 'Alps' count: 2
DELETE FROM entries (bulk delete) -> FTS Match 'Alps' count: 0
```
*Confirmation:* SQLite's truncate optimization is automatically bypassed when triggers exist, ensuring FTS5 remains synchronized even during bulk table deletions.

### Test D: 10,000 Entries Scale Benchmark
We seeded 10,000 realistic entries spread over 3.4 years with FTS indexing enabled:
- 10,000 entries batch-inserted with FTS triggers: **160.4 ms**
- Timeline Page 1 (50 entries): **0.094 ms**
- Deep Cursor Pagination (page 50): **0.064 ms**
- Calendar Month Scan: **0.052 ms**
- Single entry lookup by ID: **0.014 ms**
- FTS5 Prefix Search (`"tokyo"*`) with snippet formatting and rank ordering: **1.88 ms**
- Database size on disk (checkpointed): **~472 KB** (excluding media files)

---

## 6. Things That Should NOT Be Changed

To prevent regression and respect the project's design philosophy:

1. **Do NOT normalize `images` and `audios` into a separate table:**
   Storing media URIs as JSON strings in `entries` is ideal for this application. Media files are always read, updated, and deleted together with their parent entry. Creating an `entry_media` table would add join overhead, require cascades, and violate the two-file cohesion principle without providing any functional benefit.
2. **Do NOT use `WITHOUT ROWID` on `entries`:**
   The `entries_fts` external-content table relies on SQLite's 64-bit integer `rowid` (`content_rowid='rowid'`). Using `WITHOUT ROWID` would break the FTS5 mirror entirely.
3. **Do NOT replace FTS5 external content with a standalone FTS table:**
   External content tables avoid duplicating text data across tables, keeping the SQLite file compact and cache-friendly.
4. **Do NOT replace `withLock` with an external mutex library:**
   The lightweight promise chain in `database.ts` does its job with zero dependencies and no runtime overhead.
5. **Do NOT switch to an ORM (e.g. TypeORM, Prisma, WatermelonDB):**
   The direct SQL implementation with typed query mappers is lean, transparent, and significantly faster than any React Native ORM abstraction.

---

## 7. Final Production-Readiness Verdict

### Status: **PRODUCTION-READY (WITH MINOR ACTION ITEMS)**

The database layer in OpenLog is well-crafted, exceptionally fast, and properly aligned with React Native and Expo SQLite best practices. It easily handles 10,000+ entries with sub-millisecond query latencies.

**Required Action Items Before Heavy Scale:**
1. Add `db.withTransactionAsync` to `setSettingsBatch` in [`src/services/db/settings.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/settings.ts#L41-L52).
2. Set `PRAGMA synchronous = NORMAL;` and `PRAGMA busy_timeout = 5000;` in [`src/services/db/database.ts`](file:///Users/rwitesh/Work/openlog/src/services/db/database.ts#L18-L21).
3. Introduce `PRAGMA user_version` schema versioning before shipping any future schema additions.
