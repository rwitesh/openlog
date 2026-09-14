# Backup: Export & Import in OpenLog

This guide explains how OpenLog exports and imports timeline backups. It describes how the process works in plain terms, why it protects your data from corruption or data loss, and how every failure scenario is handled.

---

## 1. Overview & Core Philosophy

OpenLog is local-first. Your notes, photos, audio recordings, and attachments live on your device, not in the cloud.

A backup file (with the `.openlog` extension) is a single, self-contained archive containing:
- **`manifest.json`**: Basic metadata (entry count, media count, schema version, creation time).
- **`database.sqlite`**: A snapshot of your SQLite timeline database.
- **`media/`**: All photos, voice recordings, and file attachments attached to your entries.

The system is designed with one absolute rule: **your existing timeline must never be lost or corrupted, even if your phone runs out of battery, runs out of disk space, or crashes mid-restore.**

---

## 2. How Export Works

When you create a backup:

1. **Lock Database & Block Deletions**
   OpenLog pauses background media cleanups so no files are deleted while the backup is being assembled.
2. **Snapshot SQLite**
   The active database connection creates a snapshot including any uncommitted WAL (Write-Ahead Logging) data, without opening conflicting native connections.
3. **Verify Size Limits**
   The database size is verified before and after serialization (up to 256 MiB).
4. **Stream into Archive**
   The database snapshot and all active media files are streamed into a compressed `.openlog` archive file in your device's cache.
5. **Share & Clean Up**
   The archive is handed over to the system share sheet (saving to Files, Google Drive, AirDrop, etc.). Temporary snapshot files are deleted immediately.

---

## 3. How Import Works

Importing a backup is divided into careful phases to guarantee your existing data is never destroyed prematurely:

### Step 1: Preflight & Safety Checks
Before touching any data on disk:
- **Manifest check**: Verifies the file is a valid OpenLog archive and was not created by a future, incompatible version of the app.
- **Path validation**: Rejects malicious archives containing path traversals (`..`), unexpected root files, or invalid paths.
- **Storage preflight**: Calculates the exact disk space required (archive + uncompressed database & media + rollback copy of your current timeline + safety buffer). If your device lacks space, the import stops immediately before any files are changed.

### Step 2: Staging & Deep Validation
The archive is extracted into an isolated staging folder (`restore-staging/`):
- **Database integrity**: Runs SQLite integrity checks and foreign key validations.
- **Schema verification**: Ensures all required tables (`entries`, `tags`, `entry_tags`, `settings`) and indexes exist with correct constraints.
- **Search index check**: Verifies the Full-Text Search (FTS5) table and sync triggers, repairing them if necessary.
- **Media reference check**: Inspects every photo, recording, and file referenced in the database entries to ensure the corresponding file exists in the archive.

If any check fails, the staging folder is discarded and your current timeline remains completely untouched.

### Step 3: Durable Journal & Safe Swap
Once validation passes, OpenLog performs an atomic swap:
1. **Transaction Journal**: A durable journal file (`restore-journal.json`) is written to disk recording the swap plan, backed by a duplicate `.bak` copy.
2. **Database Swap**: Your existing `app.db` is moved to `app.db.bak`; the staged database is moved into place.
3. **Media Swap**: Your existing `media/` folder is moved to `media.bak`; the staged media files are moved into place.

### Step 4: Verification & Completion
When the app re-opens the new database:
1. It verifies the new database opens cleanly and initializes the schema.
2. If verified: the temporary backup files (`app.db.bak`, `media.bak`) and the journal are safely purged.
3. A system notification confirms that your timeline has been successfully restored.

---

## 4. Scenario Checklist & Failure Handling

Here is how OpenLog handles every real-world scenario:

| Scenario | What Happens | Result |
| :--- | :--- | :--- |
| **Normal Restore (Happy Path)** | Preflight passes &rarr; Staged & validated &rarr; Swapped &rarr; Verified &rarr; Cleaned up. | Timeline restored seamlessly. |
| **Corrupted or Tampered Archive** | Archive validation fails during unpack or SQLite integrity check. | Import stops. Existing timeline untouched. |
| **Newer App Version Archive** | Manifest indicates a schema version higher than the app supports. | Import halts with a friendly message asking you to update OpenLog. |
| **Insufficient Disk Space** | Preflight calculates required bytes vs available free space. | Blocked upfront before extracting any data. No disk full crashes. |
| **Missing Referenced Photos / Files** | Referential integrity check detects an entry points to a missing file. | Import aborts; invalid backup rejected. Existing data untouched. |
| **Power Loss During Extraction** | Phone shuts off while unpacking to staging. | On reboot, incomplete staging directory is wiped. Active timeline untouched. |
| **Power Loss During Database Swap** | Journal indicates phase `database-swapped`. | On next app launch, recovery detects interrupted phase and resumes media swap, or safely rolls back to original `app.db.bak`. |
| **Power Loss After Media Swap** | Journal indicates phase `media-swapped`. | On next launch, OpenLog verifies the database, confirms completion, and removes `.bak` copies. |
| **Corrupted Database in Staged Backup** | Database fails schema check or throws on open after swap. | Automatic rollback kicks in: restores `app.db.bak` and `media.bak`. Original timeline restored. |
| **Corrupted Journal File** | Main journal file is unreadable or truncated. | Recovery automatically restores from `restore-journal.bak` or `.tmp`. If all copies are lost, scans disk for `.bak` files to ensure safety. |
| **Concurrent Media Deletion During Export** | User deletes an entry while an export is generating. | Export gate holds media cleanup until export finishes, preventing missing files in the archive. |

---

## 5. Summary

- **Never destructive upfront**: All decompression and validation happens in an isolated staging sandbox.
- **Fail-safe recovery**: Interrupted imports recover automatically on the next launch using durable state journals and rollback files.
- **Referential integrity**: Media and entries are verified together so you never end up with broken photo or audio links.
