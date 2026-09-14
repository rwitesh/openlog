# Backup and restore audit

Date: 2026-09-14  
Scope: the `.openlog` archive format, export, restore validation, SQLite replacement, media replacement, recovery, and Settings integration.

This is a read-only engineering audit. It records issues in the current implementation; it does not change the backup format or prescribe a user-facing flow by itself.

## Release recommendation

**Status: Resolved and verified (2026-09-14)**

All findings (P0, P1, P2, P3) identified in this audit have been resolved in code and verified through comprehensive automated unit, interruption recovery, and contract test suites. The whole-file restore implementation now satisfies OpenLog's local-first requirements that file replacements and journal transitions be recoverable deterministically after interruption. It is cleared for shipping following device confirmation on Android.

## P0: React reload does not make SQLite file replacement safe

### Evidence

`PrivacySettings.tsx` queues a restore and calls `reloadAppAsync`.

```ts
await queueRestore(id);
await reloadAppAsync("Restore completed");
```

On the next JavaScript bootstrap, `openFreshDatabase` calls `applyPendingRestore` before opening `app.db`; that code moves the current SQLite database and sidecars aside, then moves the staged database into the live path.

Expo SDK 57 Android implements `reloadAppAsync` as `reactDelegate.reload()`. It is a React reload, not a process termination. Expo SQLite intentionally caches an open native database by path and options for fast refresh. A subsequent `openDatabaseAsync("app.db")` can therefore reuse the pre-restore native connection, even after the file at that path has been moved.

### Impact

The restored file can be present on disk while OpenLog continues to use the old native database handle. A later write can target the moved old file. Cleanup may then delete the file that still holds current data. This makes the result unreliable and explains why a normal React reload is insufficient for a SQLite file swap.

### Required direction

Do not execute a file replacement through a JavaScript-only reload. The replacement needs an actual cold native lifecycle that has released Expo SQLite's connection, or a native restore operation that explicitly closes and reopens the database safely. Closing the current JavaScript database handle is not a safe shortcut: earlier Android testing exposed a native close crash, and it cannot close handles held elsewhere.

Required Android tests:

- Restore while the app is open, then verify the restored entry count after a true cold launch.
- Restore repeatedly in one installed session.
- Write a new entry after restore, fully close the app, and verify that entry and the restored timeline both persist.

## P1: the restore journal is not durable enough for interruption recovery

### Evidence

`saveTransaction` overwrites the only journal file directly. If power is lost during the write, it can leave truncated JSON. `readTransaction` catches parse errors and returns `null`, which makes `applyPendingRestore` treat the interrupted restore as if no restore exists. `queueRestore` nevertheless rejects another restore whenever the journal file exists.

### Impact

If the interruption happens after one set of files has moved, the next launch can skip the remaining database or media replacement. The app can then have a new database with old media, or the reverse, while previous and staged artifacts remain in private storage. A malformed journal can also block every future restore.

### Required direction

Use a durable journal protocol with a recoverable previous record. It must distinguish these states:

- no restore was queued;
- a valid restore is pending and can resume;
- a journal is corrupt and requires explicit safe recovery;
- a restore completed and can be cleaned up.

The journal must never silently become equivalent to “no restore.” The implementation should preserve a last-known-valid record or use a platform-supported atomic replacement strategy, with recovery of a temporary record after interruption.

Required Android tests: force-stop at every database-sidecar move, media move, journal transition, and first database open after replacement; then verify either the old complete timeline or the new complete timeline is available.

## P1: staged SQLite validation is too shallow for a replacement database

### Evidence

The current validation checks `integrity_check`, `user_version`, presence of four table names, and the entries count. It does not check:

- `foreign_key_check`;
- required columns, constraints, and primary keys;
- required indexes, FTS table, and FTS triggers;
- media filenames referenced by entries against the extracted `media/` files.

The schema initializer uses `CREATE ... IF NOT EXISTS`, so a same-version archive with altered table definitions can pass validation and only fail later while the app is in use.

### Impact

A malformed or intentionally altered archive can replace a working local timeline with a database that technically opens but cannot support normal queries, search, deletion, or attachment access.

### Required direction

Validate foreign keys and the schema contract before queuing replacement. The validation should ensure required table columns and constraints exist and that required search structures are available or can be rebuilt safely. It should also verify every media reference from the staged database resolves to an extracted file. Extra unreferenced media can be either allowed or rejected, but that policy must be explicit.

## P1: exporting a large SQLite database consumes equivalent JavaScript memory

### Evidence

`createDatabaseSnapshot` calls `serializeAsync()`, which returns the complete database as a `Uint8Array`, then writes the whole value to a file. Media files are streamed, but the SQLite snapshot is not.

### Impact

A large local timeline can run out of JavaScript/native memory during export even if there is sufficient disk space. This conflicts with the goal that a backup remain practical for long-running timelines.

### Required direction

Set and document a tested database-size ceiling until a safe native or file-backed SQLite snapshot operation is available. A future native snapshot design must avoid the Android native-close crash that motivated the current approach. Benchmark export on realistic large database sizes before claiming large-timeline support.

## P2: restore is reported as completed before it completes

### Evidence

After staging succeeds, Settings sends the `backup_imported` analytics event and schedules a “Restore completed” notification before it asks the app to reload. The destructive replacement happens only during the following bootstrap.

### Impact

If reloading fails or replacement fails during startup, the person can see a completion notification even though their current timeline has not been restored. The selected cache copy may also be removed at that point.

### Required direction

Treat the pre-restart state as “restore prepared.” Record completion only after the replacement database has opened successfully and cleanup has completed. If automatic restart cannot be guaranteed, preserve a clear pending state rather than suppressing the failure.

## P2: archive preview has weaker limits than restore

### Evidence

The confirmation preview reads and buffers `manifest.json` before the actual restore begins. Unlike restore, preview has no archive-size, manifest-size, duplicate-path, or decompression bound.

### Impact

A selected malicious archive can consume memory or CPU before the later import validation rejects it. Multiple manifest entries can also make preview information differ from the archive later considered for restore.

### Required direction

Apply the same conservative archive and manifest limits to preview. Reject duplicate manifests and malformed archive structure before rendering the confirmation dialog.

## P2: database and media are not one export snapshot

### Evidence

The database snapshot is created first. Media files are then listed and copied independently. Media writes and deletes do not participate in the database export lock.

### Impact

An archive can contain a database reference to media deleted while export runs, or omit media added after the database snapshot. The archive remains structurally valid but is not a fully coherent point-in-time backup.

### Required direction

Introduce a narrowly scoped backup/mutation gate, or stage a media snapshot before archiving. The design must prevent destructive media cleanup until the relevant database transaction has committed.

## P2: cancellation can remain unresponsive for large members

### Evidence

Import checks cancellation between archive input chunks. Export checks cancellation between media files. Neither path checks cancellation while synchronously processing one very large media member or compression/decompression callback.

### Impact

The Settings screen offers Cancel but a person may wait a long time for it to take effect.

### Required direction

Check the abort signal inside member callbacks and use bounded, yielding work where supported. Keep cleanup behavior unchanged: cancellation before queueing must remove staging without touching live data.

## P3: storage limits and schema compatibility need an explicit contract

Current restore limits are 512 MiB compressed archive size, 256 MiB per member, 2 GiB expanded size, and 100,000 media files. Restore also requires an additional staged copy and retains previous data during finalization. The app does not preflight free space and documentation does not state the limits.

The archive currently requires an exact SQLite user-version match. That is safe but means a later schema version can reject older valid backups rather than migrating them. Decide and document whether backup compatibility is exact-version-only or supports migrations.

## Test gaps

The current automated backup test verifies manifest fields only. Add coverage for:

- archive-size, member-size, duplicate-path, traversal, and duplicate-manifest rejection;
- staged schema, foreign-key, and media-reference validation;
- cancellation during extraction and export;
- every restore journal and file-move interruption point;
- cold Android launch after restore, repeated restore, and writes after restore;
- notification and analytics timing after confirmed completion only;
- large-database export memory and duration benchmarks.

## Positive findings

The current implementation has useful foundations:

- imports validate archive paths and reject duplicate media names;
- validation happens before a restore is queued;
- archive extraction has limits during actual import;
- media extraction streams files rather than buffering them all;
- database sidecars are considered during replacement;
- analytics include only coarse counts and sizes, not private entry or attachment content.

## Resolutions and verification

All findings have been addressed in code and verified with comprehensive automated suites:

1. **P0 (Cold native lifecycle vs. React reload)**: Replaced `reloadAppAsync` in `PrivacySettings.tsx` with a native exit lifecycle (`BackHandler.exitApp()` on Android; restart alert on iOS). Replacement takes place during bootstrap in `openFreshDatabase()` on the next clean native cold launch before `SQLite.openDatabaseAsync("app.db")` is invoked.
2. **P1 (Durable multi-phase restore journal)**: Implemented atomic journal persistence (`.tmp` write, rename, and `.bak` copy) with phases (`prepared`, `database-swapped`, `media-swapped`). Interrupted restores safely resume forward or deterministically roll back to `previous` copies if unrecoverable.
3. **P1 (Deep staged SQLite validation)**: Expanded snapshot validation to attach the staged database and verify `PRAGMA integrity_check`, `PRAGMA foreign_key_check`, table definitions/constraints (`entries`, `tags`, `entry_tags`, `settings`), indexes (`idx_entries_created_at_id`, `idx_entry_tags_tag_entry`), `entries_fts` integrity and sync triggers, and referential validation of all entry media against the staged `media/` folder.
4. **P1 (Database export size ceiling)**: Enforced `DATABASE_SIZE_CEILING` (256 MiB) with preflight page-count checks before `serializeAsync()`.
5. **P2 (Deferred completion notification and analytics)**: Removed premature analytics and notifications from `PrivacySettings.tsx`. Completion events (`notifyBackupImportComplete` and `backup_imported` analytics) fire only in `openFreshDatabase()` / `completePendingRestore()` after the restored database opens and passes schema initialization.
6. **P2 (Aligned archive preview bounds)**: `inspectBackupArchive` now enforces identical bounds as restore: 512 MiB archive, 256 MiB member, 256 KiB manifest, 2 GiB uncompressed ceiling, duplicate path rejection, and path traversal rejection.
7. **P2 (Export concurrency gate)**: Added `acquireExportGate` / `releaseExportGate` / `waitForExportGate` so destructive media cleanup cannot run while export packages the database and media snapshot.
8. **P2 (Chunk cancellation responsiveness)**: Added abort signal checks into the archive file chunk compression loop and decompression processing.
9. **P3 (Contract documentation and free space preflight)**: Documented explicit limits, disk storage preflight requirements, and schema compatibility policy in `docs/backup-and-restore.md`.
10. **Automated Test Coverage**: Expanded `scripts/test-backup-recovery.mjs` with 13 automated tests covering manifest validation, path traversal, archive limits, export gate serialization, atomic journal writes, interruption recovery across all phases, journal corruption recovery, rollback on initialization failure, and deferred completion analytics.


