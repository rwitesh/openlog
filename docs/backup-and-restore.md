# Backup and restore

OpenLog backups preserve the complete local timeline in one portable `.openlog` file. They are intended for recovery or moving OpenLog data to another device, not as a human-readable export.

## Archive contents

Each `.openlog` file is a ZIP archive:

```text
openlog-backup-YYYYMMDD-HHMMSS.openlog
├── manifest.json
├── database.sqlite
└── media/
```

- `manifest.json` contains the archive format, format version, creation time, app version, and entry and media counts.
- `database.sqlite` is a SQLite snapshot of the local database. Entries, tags, settings, and search indexes stay in their native form.
- `media/` contains the files referenced by entries.

Archive filenames include the export timestamp. Temporary working files are named with a timestamp and random identifier; they are never given generic names such as `restore.sqlite`.

## Storage limits and space requirements

To guard device memory, disk storage, and SQLite stability, OpenLog enforces conservative storage bounds:

### Backup limits (`BACKUP_LIMITS`)

- **Archive size limit**: 512 MiB (`archiveBytes`). Archives exceeding 512 MiB are rejected before extraction.
- **Member size limit**: 256 MiB (`memberBytes`). Any individual file in the archive (such as a large video or database) exceeding 256 MiB is rejected.
- **Expanded size limit**: 2 GiB (`uncompressedBytes`). The total uncompressed content of an archive cannot exceed 2 GiB.
- **Manifest size ceiling**: 256 KiB (`manifestBytes`). Guards against oversized metadata payloads.
- **Media file count limit**: 100,000 files (`media`).
- **Database size ceiling**: 256 MiB (`DATABASE_SIZE_CEILING`). Enforced prior to database serialization during export and during snapshot verification.

### Restore disk space requirements

Restore is an out-of-place replacement operation designed to guarantee zero data loss even in the event of unexpected app termination, hardware crash, or power loss. Consequently, sufficient free disk storage is required during the restore process for:

1. The downloaded or selected `.openlog` archive file in cache storage.
2. The staged, uncompressed SQLite snapshot and media files in app-private document storage.
3. The existing local timeline's SQLite database files and active `media/` directory, retained as a rollback copy during the swap.
4. A 50 MiB safety buffer preflighted prior to archive extraction.

Once the replacement database has been opened, verified, and its schema initialized on native restart, all rollback artifacts and temporary staging files are permanently deleted.

## Schema compatibility contract

Restore validates the database schema and structure before committing to any file replacement:

- **Version constraint**: The SQLite `user_version` of the backup must satisfy `user_version <= DATABASE_SCHEMA_VERSION`.
- **Forward compatibility rejection**: Any backup whose `user_version` is greater than `DATABASE_SCHEMA_VERSION` is rejected, prompting the user to update OpenLog. Newer schemas may contain table definitions, triggers, or constraints that an older app version cannot safely query or maintain.
- **Backward compatibility and migrations**: Backups with valid older schema versions are accepted. Their schema will be upgraded cleanly by the schema initializer (`initializeDatabaseSchema`) upon first cold launch after the file swap.
- **Structural integrity validation**: The staged database is attached to the active database connection and strictly inspected:
  - `PRAGMA integrity_check` must return `"ok"`.
  - `PRAGMA foreign_key_check` must return zero violations.
  - Required tables must exist: `entries`, `tags`, `entry_tags`, and `settings`.
  - Columns and constraints:
    - `entries`: Primary key on `id`, required columns (`created_at`, `updated_at`, `text`, `images`, `audios`, `attachments`, `latitude`, `longitude`, `location`).
    - `tags`: Primary key on `id`, unique constraint on `key`, required columns (`name`, `color_id`, `created_at`, `updated_at`).
    - `entry_tags`: Composite primary key on `(entry_id, tag_id)` with active foreign key references to `entries.id` and `tags.id`.
    - `settings`: Primary key on `key`, required column `value`.
  - Required indexes must exist: `idx_entries_created_at_id` and `idx_entry_tags_tag_entry`.
  - Search indexes: `entries_fts` and its synchronization triggers (`entries_fts_ai`, `entries_fts_ad`, `entries_fts_au`) are verified, tested with `integrity-check`, and automatically rebuilt if absent or corrupted.
  - Referential media verification: Every attachment URI found in `entries` (`images`, `audios`, `attachments`) is checked against the extracted `media/` folder. If any referenced media file is missing from the archive, the restore is rejected before replacement is queued. Unreferenced orphan media files in the archive are tolerated.

## Export

When someone exports a backup, OpenLog:

1. Acquires the export gate to serialize with any concurrent media cleanup operations.
2. Checks that the active database is within `DATABASE_SIZE_CEILING`.
3. Serializes the active SQLite connection, including committed WAL data, into a temporary snapshot.
4. Counts the entries and lists the durable media files.
5. Streams the snapshot, each media file, and the manifest into one `.openlog` archive.
6. Copies or shares the completed archive.
7. Releases the export gate and removes the temporary snapshot. If export fails or is cancelled, it also removes the incomplete archive.

The archive is created incrementally, so media files are streamed rather than loaded all at once into JavaScript memory.

## Restore lifecycle and durable journal state machine

Because SQLite native drivers cache open database handles for fast refresh, hot file replacement under an active React Native session is unsafe. OpenLog coordinates restore through a durable, multi-phase journal executed across a clean native cold restart:

### 1. Preparation and verification

1. The user selects a backup file. The archive manifest, member sizes, paths, and free storage are validated.
2. The database and media files are extracted into unique staging directories (`openlog-restore-<id>.sqlite`, `openlog-restore-<id>-media`).
3. Schema compatibility, database integrity, and media references are strictly validated against staging.
4. OpenLog writes an initial transaction record with phase `"prepared"` using a durable write protocol (preserving the previous record in `.bak` first, then directly writing the new transaction to `.json`, avoiding in-place file move exceptions on Android).
5. OpenLog displays a "Restore Prepared" modal:
   - On Android: Prompts the user to close OpenLog completely from Recent Apps and reopen it (with a "Close OpenLog" option).
   - On iOS: Prompts the user to close OpenLog from the app switcher and reopen it.

### 2. Native cold launch swap

When OpenLog boots freshly, `openFreshDatabase()` runs before the SQLite connection is established:

1. `applyPendingRestore()` reads the durable journal:
   - If phase is `"prepared"`:
     - Moves `app.db` (and `-wal`, `-shm` sidecars) to `openlog-restore-<id>-previous.sqlite`.
     - Moves staged database into `app.db`.
     - Atomically updates journal phase to `"database-swapped"`.
     - Moves current `media/` to `openlog-restore-<id>-previous-media`.
     - Moves staged media to `media/`.
     - Atomically updates journal phase to `"media-swapped"`.
   - If phase is `"database-swapped"` (interrupted mid-media swap):
     - Continues moving media to complete the swap. If staged media is missing, rolls back to original files.
     - Atomically updates journal phase to `"media-swapped"`.
   - If phase is `"media-swapped"`:
     - Files are already in their live locations; proceeds directly to database verification.

### 3. Verification and completion

1. OpenLog attempts to open `app.db` and runs `initializeDatabaseSchema(db)`.
2. **On failure**: If opening or schema initialization throws an error:
   - `rollbackPendingRestore()` immediately restores `openlog-restore-<id>-previous.sqlite` (and sidecars) to `app.db`, and `openlog-restore-<id>-previous-media` to `media/`.
   - Staging files and journal records are purged.
   - OpenLog reopens the original database. The user's existing timeline remains intact with zero data loss.
3. **On success**:
   - `completePendingRestore(db)` deletes previous database rollback files and previous media directories.
   - All journal files (`.json`, `.bak`, `.tmp`) are removed.
   - Fired completion events: `notifyBackupImportComplete(entryCount)` sends a system notification, and `analytics.capture("backup_imported", { entry_count })` records the verified restore.

## Interruption recovery guarantees

- **Corrupted or truncated journal**: If the `.json` journal file is damaged or unparseable, OpenLog inspects `.bak` and `.tmp`. If all journal files are unrecoverable, OpenLog scans disk for previous rollback artifacts (`openlog-restore-*-previous.sqlite`, `openlog-restore-*-previous-media`). If previous files are detected, OpenLog automatically rolls back to guarantee timeline consistency.
- **Interruption during file moves**: Because live files are preserved under `previous` names until verification succeeds, any crash during phase transitions either resumes forward safely or deterministically rolls back to the prior complete timeline.
