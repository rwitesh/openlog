# Review Findings

Open items from the codebase review of 2026-10-14 (v1.3.10). Re-checked on 2026-11-12 against `main` at `ecc92b8` (v1.3.13 plus the app-lock privacy cover, PR #6); resolved items were removed. IDs are kept from the original review.

Nothing here was verified on a device.

| ID | Priority | Area | Finding |
| --- | --- | --- | --- |
| P1-2 | P1 | Backup | Export and import freeze the app; Cancel and progress don't work |
| P1-3 | P1 | Media / backup | Media cleanup and saves can race a restore and delete restored files |
| P2-2 | P2 | Backup export | Export can create a backup that import rejects |
| P2-3 | P2 | Media | Unused media files are never deleted from disk |
| P2-4 | P2 | Backup | A second export can release an import while the first is still reading |
| P2-5 | P2 | Backup import | Restored attachments lose their file type |
| P2-6 | P2 | Tests | Restore validation and rollback have no automated tests |
| P3-1 | P3 | Media | Photos that aren't downscaled are saved with a `.jpg` extension |
| P3-2 | P3 | Startup | A database open failure is swallowed |
| P3-3 | P3 | Privacy | `android:allowBackup` is left at the platform default |
| P3-4 | P3 | Fonts | Font downloads use an unpinned `@latest` CDN URL |

## P1

### P1-2. Export and import freeze the app; Cancel and progress don't work

**Where:** `exportBackupArchive` media loop and `addFileToArchive` in [src/services/backup/export/index.ts](../src/services/backup/export/index.ts); the archive read loop in [src/services/backup/import/index.ts](../src/services/backup/import/index.ts).

Both loops read and push chunks synchronously and never yield. The UI freezes for the whole operation, `onProgress` never renders, and Cancel can't set `signal.aborted` until the loop ends.

**Fix:** yield every 1–4 MB (`await new Promise((resolve) => setTimeout(resolve, 0))`). Both functions are already `async`; `addFileToArchive` must become `async` too.

### P1-3. Media cleanup and saves can race a restore and delete restored files

**Where:** `cleanupMedia` in [src/modules/entry/store/EntryStore.ts](../src/modules/entry/store/EntryStore.ts); `persistMedia` and `deleteMediaFiles` in [src/services/media/storage.ts](../src/services/media/storage.ts).

`cleanupMedia` calls `filterUnreferencedMedia` before `deleteMediaFiles` waits on the export and import gates. If a restore runs in between, the files are deleted even when the restored timeline references them (likely when restoring your own older backup). `persistMedia` has the mirror race: it waits on the gate only at the start, so a copy in flight can be pruned by a restore that starts after it.

**Fix:** wait on the gates first, then compute unreferenced files — move the wait into `cleanupMedia` before `filterUnreferencedMedia`, or hold one media lock across "check references, then delete".

## P2

### P2-2. Export can create a backup that import rejects

**Where:** `referencedMediaFiles` and `addFileToArchive` in [src/services/backup/export/index.ts](../src/services/backup/export/index.ts).

Missing referenced media is now reported to error telemetry, but the export still skips it and succeeds. `timeline.json` keeps the references, so `assertBackupMediaReferences` rejects the archive on restore — possibly after the original device is gone.

**Fix:** if any referenced file is missing, fail the export with a clear message, or let the user knowingly drop those references.

### P2-3. Unused media files are never deleted from disk

**Where:** [src/modules/compose/utils/DraftTransform.ts](../src/modules/compose/utils/DraftTransform.ts), [src/services/media/storage.ts](../src/services/media/storage.ts), `clearAll` in [src/modules/entry/store/EntryStore.ts](../src/modules/entry/store/EntryStore.ts).

Export already skips unreferenced files. Still open: media copied before a failed or interrupted save, and files left after an interrupted restore, stay on disk forever; "Delete all data" removes only referenced media.

**Fix:** an occasional sweep (startup or before export) that deletes files in `media/` no entry references, older than a short grace period so in-progress saves are safe. Draft media lives in `documents/drafts/` and is out of scope.

### P2-4. A second export can release an import while the first is still reading

**Where:** `acquireExportGate` in [src/services/backup/utils/index.ts](../src/services/backup/utils/index.ts).

It resolves the previous export's gate before replacing it, so an import waiting on the first export starts while that export still reads files. The UI blocks concurrent exports, but the gate doesn't. Count active exports, or throw on a second acquire as `acquireImportGate` does.

### P2-5. Restored attachments lose their file type

**Where:** export mapping in [src/services/backup/export/index.ts](../src/services/backup/export/index.ts), [src/services/backup/import/timeline.ts](../src/services/backup/import/timeline.ts), `parseAttachments` in [src/services/db/uris.ts](../src/services/db/uris.ts).

Export writes `mimeType`; import stores the attachment JSON as-is; `parseAttachments` reads `mime`. Restored attachments lose the type `AttachmentChip` uses. Map `mimeType` back to `mime` (and validate it) on import.

### P2-6. Restore validation and rollback have no automated tests

The atomic-restore fix (v1.3.11) removed `scripts/test-backup-recovery.mjs`. The validation rules in `assertBackupTimelineData` (missing/duplicate tag ids, duplicate entry ids, duplicate tag keys, non-string settings) and the rollback path have no coverage. At least the pure validation rules can be tested in Node.

## P3

### P3-1. Photos that aren't downscaled are saved with a `.jpg` extension

`downscaleImage` returns the original URI for images ≤ 1920 px, and `fromDraft` always calls `persistMedia(uri, "jpg")`. PNG, HEIC, and WebP end up labelled `.jpg`, which other apps may mishandle after export or share. Take the extension from the source file or picker MIME type.

### P3-2. A database open failure is swallowed

[src/shared/hooks/useAppBootstrap.ts](../src/shared/hooks/useAppBootstrap.ts) catches a `getAllUserPreferences` failure and continues with defaults. If the database can't open (downgrade, failed migration), the user lands on Welcome and every save fails. Show an error screen that explains the problem and doesn't touch data.

### P3-3. `android:allowBackup` is left at the platform default

`app.json` doesn't set it, so Android auto-backup may copy `app.db` (without media) to Google Drive. Decide deliberately: disable it via `expo-build-properties`/a config plugin, or document it.

### P3-4. Font downloads use an unpinned `@latest` CDN URL

[src/services/fonts/resolver.ts](../src/services/fonts/resolver.ts) fetches `cdn.jsdelivr.net/fontsource/fonts/<slug>@latest/...`. Pin a version, and say in the privacy copy that choosing a custom font makes a network request.

## Suggested order

1. **P1-3** — the race that can delete restored media.
2. **P1-2** — yield in backup loops so Cancel and progress work.
3. **P2-5, P2-4, P2-2, P2-6, P2-3**, then P3 as they come up.

P1-2 needs checking on a real Android and iOS device.
