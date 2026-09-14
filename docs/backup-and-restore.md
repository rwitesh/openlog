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

## Export

When someone exports a backup, OpenLog:

1. Serializes the active SQLite connection, including committed WAL data, into a temporary snapshot.
2. Counts the entries and lists the durable media files.
3. Streams the snapshot, each media file, and the manifest into one `.openlog` archive.
4. Copies or shares the completed archive.
5. Removes the temporary snapshot. If export fails or is cancelled, it also removes the incomplete archive.

The archive is created incrementally, so media is not loaded all at once into JavaScript memory.

## Restore

Restore is a replacement operation, not a row-by-row import. It does not insert the backup’s entries into the existing database.

1. OpenLog reads the selected archive in chunks and validates its format, paths, filenames, duplicate entries, declared counts, and size limits.
2. It extracts the database and media into a uniquely named staging area in app-private storage.
3. The staged SQLite file is checked for integrity, supported schema version, required tables, and its entry count.
4. After validation, OpenLog writes a small restore transaction record and reloads the app automatically.
5. Before SQLite opens on the reloaded app, OpenLog moves the current database files aside, moves the staged SQLite file into the live SQLite directory, then replaces the media directory.
6. Once the replacement database opens and its schema is initialized, OpenLog deletes the previous database and media copies and clears the transaction record.

The backup database replaces the existing SQLite file, including all tables and indexes. This keeps restores practical even for a very large timeline.

## Failure handling

Validation happens before any live data is moved. A bad archive, extraction failure, cancellation, or database validation failure leaves the current database and media untouched and removes staging data.

After a restore has been queued, the transaction record records progress through the database and media replacement. The next app launch resumes an interrupted replacement from that point. Previous database files and media are retained until the replacement database has opened successfully, then removed.

If a restore is queued while the app is not running, opening OpenLog applies it before the database is opened.
