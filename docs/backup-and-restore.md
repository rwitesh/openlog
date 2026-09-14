# OpenLog backup and restore

OpenLog backups are designed to save the whole local timeline in one file.

## What is inside a backup?

The backup file is a ZIP archive with three parts:

```text
backup.openlog
├── manifest.json       small format and count information
├── database.sqlite     SQLite database snapshot
└── media/              saved photos, recordings, and attachments
```

The entries are not converted to another JSON format. The SQLite database is kept as SQLite, so entries, tags, settings, indexes, and search data stay together.

The manifest contains only backup metadata: the format version, creation time, app version, entry count, and media count. The current archive format is version 1.

## Export

1. Open Export in Settings.
2. OpenLog asks SQLite for a native database snapshot. This includes committed data even though the app uses SQLite WAL mode.
3. OpenLog reads the durable `media` directory and adds each file to the archive.
4. OpenLog writes the manifest and finishes the archive.
5. Only a completed archive is offered to the user. If export is cancelled or a media file cannot be read, the incomplete archive is removed.

The database snapshot and media files are temporary working files. They are deleted after the archive is finished or after export fails.

## Import

Import never starts by deleting the current timeline.

1. OpenLog reads the archive in chunks.
2. It checks the archive format, allowed paths, duplicate names, size limits, media count, and manifest.
3. It extracts the SQLite file and media files into temporary staging locations.
4. It opens the staged database and checks SQLite integrity, schema version, required tables, and entry count.
5. Only after all checks pass does OpenLog prepare the restore transaction.
6. The staged media directory is moved into place.
7. SQLite’s native backup API copies the staged database into the live database. A restore marker is written into the staged database immediately before this handoff.
8. After the database handoff succeeds, the old media directory is removed and the transaction record is cleared.

## What happens when something fails?

### The archive is invalid or cannot be extracted

The current database and current media remain untouched. Temporary staged files are removed.

### SQLite integrity or schema validation fails

The current database and media remain untouched. OpenLog does not begin the replacement step.

### Media staging fails

The current database and media remain untouched. The restore stops before the handoff.

### The app stops while media is being replaced

OpenLog leaves a small restore transaction record in the Documents directory. On the next app start, OpenLog reads that record and restores the previous media directory if the database handoff did not commit.

### The app stops after the SQLite handoff commits

The database contains the restore marker. On the next app start, OpenLog treats the restore as committed, keeps the new media, removes leftover staging data, and clears the transaction record.

### The SQLite handoff itself fails

The media directory is rolled back to the previous one, and the transaction record is cleared. The native SQLite backup operation is used so the live database is not replaced by a partially copied file.

## What this protects

The important rule is that an import failure cannot immediately erase the existing data. Existing data is only superseded after the new archive has been fully extracted and validated. If the process is killed during the small database/media handoff window, the restore marker and transaction record let the next app start choose a consistent outcome: keep the committed restore or restore the previous media.

The backup is an OpenLog backup, not a human-readable export. It is intended for moving or recovering the complete local timeline. A future human-readable export can be a separate feature without adding complexity to backup and restore.
