# Review Findings

Codebase review from 2026-10-14, at commit `5ad5dd4` (version 1.3.10).

**Scope:** the database layer, backup export and import, media storage, the entry store, the compose flow, app lock, and startup. UI screens were only skimmed.

**Baseline:** `pnpm test` passes (39/39) and `pnpm typecheck` is clean.

**How findings were checked:** P0-1 was reproduced against real SQLite (see its Evidence section). P0-2 was traced through the code path. Everything else comes from reading the code. Nothing was run on a device.

## Priority legend

| Priority | Meaning |
| --- | --- |
| **P0** | Loses data or silently corrupts user content. Fix before the next release. |
| **P1** | Loses unsaved work or breaks a core promise in normal use. Fix soon. |
| **P2** | A gap in correctness, privacy, or robustness that bites in edge cases. |
| **P3** | A minor issue or a decision to make deliberately. |

## Summary

| ID | Priority | Area | Finding | Status |
| --- | --- | --- | --- | --- |
| P0-1 | P0 | Backup import | A failed restore leaves the app empty: old data is deleted, new data never arrives | **Fixed** |
| P0-2 | P0 | Compose / DB | Text cannot be removed from an entry that has media | **Fixed** |
| P1-1 | P1 | Compose | Leaving compose throws away the draft without asking | Open |
| P1-2 | P1 | Backup | Export and import freeze the app; Cancel and progress don't work | Open |
| P1-3 | P1 | Media / backup | Media cleanup and saves can race a restore and delete restored files | Open |
| P2-1 | P2 | App lock | Entries are visible in the app switcher while the lock is on | Open |
| P2-2 | P2 | Backup export | Export can create a backup that import rejects | Open |
| P2-3 | P2 | Media | Unused media files are never cleaned up | Partly fixed |
| P2-4 | P2 | Backup | A second export can let an import run while the first export is still reading files | Open |
| P2-5 | P2 | Backup import | Restored attachments lose their file type | Open |
| P3-1 | P3 | Media | Photos that aren't downscaled are saved with a `.jpg` extension | Open |
| P3-2 | P3 | Startup | A database open failure is swallowed | Open |
| P3-3 | P3 | Privacy | `android:allowBackup` is left at the platform default | Open |
| P3-4 | P3 | Fonts | Font downloads use an unpinned `@latest` CDN URL | Open |

---

## P0 — Fix before the next release

### P0-1. A failed restore leaves the app empty: old data is deleted, new data never arrives

> **Fixed.** What changed:
> - **Validation** now rejects anything the database would refuse on insert: duplicate tag ids or names, duplicate entry ids, `tagIds` that are missing, repeated, or not strings, attachment names that aren't strings, location names that aren't strings, and `settings` values that aren't strings.
> - **The database change is atomic.** `replaceTimelineData` clears and inserts in one transaction.
> - **The media swap is safe.** Incoming media is added next to the live files, without overwriting any. If the transaction fails, only the added files are removed. After it commits, replaced media is pruned, and a pruning failure can't fail the restore.
> - **Interruption leaves one complete timeline.** If the process dies at any point, the user has either the old timeline or the new one, never neither. The worst case is unreferenced files left on disk.
> - **Export no longer picks up those files.** It now archives only media the timeline references.
> - **No automated tests.** `scripts/test-backup-recovery.mjs` was removed, so the rollback and the validation rules currently have no test coverage.

**Where:** [src/services/backup/import/index.ts:325-334](../src/services/backup/import/index.ts), [src/services/backup/import/timeline.ts](../src/services/backup/import/timeline.ts), [src/services/backup/utils/index.ts](../src/services/backup/utils/index.ts) (`assertBackupTimelineData`)

**What happens:** after validation, the restore runs four steps that don't depend on each other's success:

1. It deletes the live `media/` directory.
2. It deletes all rows in the database and commits that change (`clearTimelineData`, its own transaction).
3. It moves the staged media into place.
4. It inserts the backup's data in a **second** transaction (`insertTimelineData`).

If step 4 fails, or the OS kills the app between steps 1 and 4, the user ends up with an empty app. The original data is gone and the backup's data was never written.

Several things make this worse:

- **Validation misses cases that are certain to fail at insert.** `assertBackupTimelineData` does not check that:
  - every tag an entry uses exists in the backup,
  - entry ids and tag ids are unique,
  - tag names are unique (`tags.key` is `UNIQUE`),
  - the values in `settings` are strings.
- **The screen shows deleted entries.** On failure, `notifyStoreReload()` is never called, so the timeline keeps showing entries whose files no longer exist. Editing one of them throws `Entry not found`.
- **The error message is misleading.** It says "Check the backup file and available storage, then try again", which suggests nothing was changed.
- **Large restores widen the risk window.** Inserting tens of thousands of rows one at a time takes long enough that the user may switch away and Android may kill the process.

This breaks the rules in AGENTS.md: *"commit the database state before destructive cleanup"* and *"leave the existing data recoverable on failure"*.

**Evidence:** a backup with each of the problems below passed `assertBackupTimelineData`, then failed in `insertTimelineData` with 0 entries left:

| Archive content | Result |
| --- | --- |
| An entry tagged with a tag that isn't in the backup | `FOREIGN KEY constraint failed`, 0 rows left |
| Two entries with the same id | `UNIQUE constraint failed: entries.id`, 0 rows left |
| Two tags with the same name | `UNIQUE constraint failed: tags.key`, 0 rows left |

**Fix:**

1. **Add the missing checks to `assertBackupTimelineData`:**
   - every `tagIds` value is a string that refers to a tag in the backup,
   - entry ids are unique,
   - tag ids are unique,
   - tag keys are unique,
   - `settings` values are strings,
   - attachment `name` is a string.
2. **Make the database change atomic:** do the clear and the insert in **one** transaction.
3. **Swap the media folders around that transaction:**
   1. Rename `media` to `media.prev`.
   2. Move the staged media in as `media`.
   3. Run the single clear-and-insert transaction.
   4. If it commits, delete `media.prev`.
   5. If it fails, delete the new `media` and rename `media.prev` back.
4. **Recover on startup:** if `media.prev` exists, the earlier restore was interrupted. Check whether the database reflects the new data (for example with a marker row in `settings` written inside the transaction). If it does, delete `media.prev`; if not, restore it.
5. **Refresh the screen** (`notifyStoreReload()`) on any failure after staging, so the UI never shows data that is no longer there.
6. **Add tests** in `scripts/test-backup-recovery.mjs` showing that a failed insert leaves the original rows in place.

### P0-2. Text cannot be removed from an entry that has media

> **Fixed.** `NewEntryInput.text` and `UpdateEntryInput.text` are now `string | null`, matching the existing `location: null` convention: `undefined` keeps the stored text and `null` clears it. `fromDraft` returns `null` for empty text. `createEntry` stores both `""` and `null` as NULL.
>
> This fix has no automated test. The code path runs through expo-sqlite and Expo media modules, which the Node test runner can't load, and AGENTS.md rules out test-only production layers. Check it by hand on a device.

**Where:** [src/modules/compose/utils/DraftTransform.ts:13](../src/modules/compose/utils/DraftTransform.ts), [src/services/db/entries.ts:257](../src/services/db/entries.ts)

**What happens:**

1. `fromDraft` turns empty text into `undefined` (`draft.text?.trim() || undefined`).
2. `updateEntry` reads `input.text === undefined` as "leave the field unchanged".
3. So when someone clears all the text from an entry that still has a photo, audio clip, or file, and saves, the old text is kept and comes back on screen.

**Fix:** keep "unchanged" and "cleared" as different values. The simplest option is for `fromDraft` to return `text: ""` (or `null`) when the draft is empty; `updateEntry` already stores `input.text || null`. Check that `createEntry` still stores `NULL` for empty text, and add a test.

---

## P1 — Fix soon

### P1-1. Leaving compose throws away the draft without asking

**Where:** [src/screens/compose/Compose.tsx:185](../src/screens/compose/Compose.tsx)

**What happens:** the header back button, the Android back button, and the iOS swipe-back all call `navigation.goBack()` with no check. Any unsaved text, photos, recordings, files, tags, or date changes are lost, in both new-entry and edit mode. Nothing is saved in the background either, so if the OS kills the app while someone is writing, that draft is lost too.

**Fix:**

- Track whether the draft has changed from what was last saved.
- When it has, use `usePreventRemove` from `@react-navigation/native` to ask "Discard changes?" before leaving.
- Later, consider saving drafts in the background so they survive the app being killed.

### P1-2. Export and import freeze the app; Cancel and progress don't work

**Where:** [src/services/backup/export/index.ts:255](../src/services/backup/export/index.ts), [src/services/backup/import/index.ts:261](../src/services/backup/import/index.ts)

**What happens:** the export's media loop and the import's read loop run synchronously and never pause to let other JavaScript run. As a result:

- the app's interface is frozen for the whole backup or restore;
- `onProgress` updates never reach the screen;
- the Cancel button doesn't work, because the code that sets `signal.aborted` can't run until the loop has finished.

**Fix:** pause briefly every few chunks, for example `await new Promise((resolve) => setTimeout(resolve, 0))` every 1–4 MB. Both functions are already `async`, so nothing that calls them needs to change.

---

## P2 — Gaps that bite in edge cases

### P2-1. Entries are visible in the app switcher while the lock is on

**Where:** [src/services/auth/useAppLock.ts](../src/services/auth/useAppLock.ts), [src/modules/auth/components/AppLockGate.tsx](../src/modules/auth/components/AppLockGate.tsx)

**What happens:** the lock screen only appears when the app becomes active again after more than 60 seconds away. Two consequences:

- The preview that iOS and Android show in recent apps still shows the user's entries.
- When the app reopens, the content can flash briefly before the lock screen appears.

**Fix:**

- While the lock is enabled, show a plain cover whenever the app goes inactive or to the background, and keep the 60-second rule only for deciding whether to ask for authentication again.
- On Android, consider `expo-screen-capture`. It hides the app-switcher preview but also blocks screenshots, so make it a deliberate product choice.

### P2-2. Export can create a backup that import rejects

**Where:** [src/services/backup/export/index.ts](../src/services/backup/export/index.ts) (`addFileToArchive`, `listMediaFiles`)

**What happens:**

1. Export lists the files that exist in `media/` and quietly skips any that are missing.
2. Entries still refer to those missing files in `timeline.json`.
3. On restore, `assertBackupMediaReferences` rejects the whole archive.

The user only finds out when they try to restore, possibly after the original device is gone.

**Fix:** before writing the archive, check that every filename referenced in the database exists in the media list. If any are missing, fail the export with a clear message, or let the user knowingly drop the missing references.

### P2-3. Unused media files are never cleaned up

> **Partly fixed.** Export now archives only referenced media, so unused files no longer leave the device inside backups. Two parts are still open: nothing deletes those files from disk, and "Delete all data" removes only referenced media.

**Where:** [src/modules/compose/utils/DraftTransform.ts](../src/modules/compose/utils/DraftTransform.ts), [src/services/media/storage.ts](../src/services/media/storage.ts)

**What happens:** `fromDraft` copies media into `media/` before the database write. If the write fails, or the app crashes in between, the copied files stay forever. Export includes everything in `media/`, so backups grow with files nothing uses.

**Fix:** add an occasional cleanup, at startup or before export, that deletes files in `media/` that no entry references. Only delete files older than a short grace period, so a save that is still in progress isn't affected.

### P1-3. Media cleanup and saves can race a restore and delete restored files

**Where:** [src/modules/entry/store/EntryStore.ts](../src/modules/entry/store/EntryStore.ts) (`cleanupMedia`), [src/services/media/storage.ts](../src/services/media/storage.ts) (`deleteMediaFiles`, `persistMedia`)

This came up in the review of the P0 fixes. It existed before them and is not a regression.

**What happens:**

1. `patchEntry`, `removeEntry`, and "Delete all data" work out which files are unreferenced *before* waiting on the import gate.
2. If a restore runs in the meantime, they then delete those files, even when the restored timeline references them. That is likely when someone restores their own older backup.
3. `persistMedia` has the mirror-image race: a copy that passed the gate before a restore started can be pruned by it.

**Fix:** wait on the gates first, then decide what's unreferenced. One way is to move the gate wait into `cleanupMedia`, before `filterUnreferencedMedia`. The other is to hold a single media lock across "check references, then delete".

### P2-4. A second export can let an import run while the first export is still reading files

**Where:** [src/services/backup/utils/index.ts](../src/services/backup/utils/index.ts) (`acquireExportGate`)

`acquireExportGate` resolves the previous export's gate before replacing it. So a second export releases an import that was waiting on the first export, and that import's pruning can delete files the first export is still reading. The UI blocks concurrent exports today, but the gate itself doesn't guarantee it. Count active exports, or reject a second `acquireExportGate` the same way `acquireImportGate` does.

### P2-5. Restored attachments lose their file type

**Where:** [src/services/backup/export/index.ts:156](../src/services/backup/export/index.ts), [src/services/backup/import/timeline.ts](../src/services/backup/import/timeline.ts), [src/services/db/uris.ts:27](../src/services/db/uris.ts)

Export writes each attachment's type as `mimeType`. Import stores the attachment JSON as-is, but `parseAttachments` reads `mime`. So restored attachments lose their type, which `AttachmentChip` uses. Map `mimeType` back to `mime` (and validate it) when importing.

---

## P3 — Minor issues / decisions to make deliberately

### P3-1. Photos that aren't downscaled are saved with a `.jpg` extension

`downscaleImage` returns the original URI for images 1920 px or smaller, and `fromDraft` always saves them with the `jpg` extension. As a result, PNG, HEIC, and WebP files end up labelled `.jpg`. The app displays them fine, but other apps opening an exported or shared file may not. Take the extension from the source file or the picker's MIME type instead.

### P3-2. A database open failure is swallowed

[src/shared/hooks/useAppBootstrap.ts](../src/shared/hooks/useAppBootstrap.ts) catches any `getAllUserPreferences` error and continues with the default settings. If the database can't open — for example "Unsupported database version" after installing an older version, or a failed migration — the user lands on Welcome and every save fails. Show a clear error screen that explains the problem and doesn't touch the data.

### P3-3. `android:allowBackup` is left at the platform default

With no setting in `app.json`, Android's automatic backup may copy `app.db` to Google Drive. That can be useful (restoring onto a new phone), but it's at odds with "private, local-first" and with media not being included. Decide on purpose: either turn it off (`expo-build-properties` or a config plugin) or document it.

### P3-4. Font downloads use an unpinned `@latest` CDN URL

[src/services/fonts/resolver.ts:19](../src/services/fonts/resolver.ts) downloads fonts from `cdn.jsdelivr.net/...@latest/...`. Pin a version so builds are reproducible. Also note in the privacy copy that choosing a custom font makes a network request.

---

## What is already solid

Keep these patterns when fixing the issues above:

- **Database access:** one serialized queue (`runDb`), numbered migrations that are never changed after shipping, and FTS rebuilt only when it's incomplete.
- **Pagination:** keyset paging by `(created_at, id)` with a matching index.
- **Stored paths:** the database stores bare media filenames, not full paths, so the iOS issue where the app's folder path changes after an update can't break links.
- **Deleting media:** files are deleted only after the database change commits, and only when no other entry still uses them (`filterUnreferencedMedia`).
- **Restore safety checks:** protection against path tricks in the archive, duplicate paths and names, limits against zip bombs (per file, total, and file count), a staging folder, and a free-space check before starting.
- **Analytics:** restricted to counts and coarse events; session replay and autocapture are off.
- **App lock:** its state lives in device-only secure storage and never travels in a backup.

## Suggested order of work

1. ~~P0-1 and P0-2~~ — done.
2. **P1-3:** the cleanup race that can delete restored media.
3. **P1-1:** confirm before discarding changes in compose.
4. **P1-2:** pause during backup loops so Cancel and progress work.
5. **P2-5, P2-4, P2-2, P2-1, P2-3**, then the P3 items as they come up.

Before release, run `pnpm test`, `pnpm typecheck`, and `pnpm exec biome check src scripts`. P0-1, P1-1, P1-2, and P2-1 also need checking on a real Android and iOS device, including killing the app in the middle of a restore.

## Product note

For a local-first personal timeline, **reliability is the product**. One failed restore or one lost draft costs more trust than a new feature earns. After the items above, the biggest gap is that backups are manual only: if the device is lost, everything on it is lost. An opt-in automatic backup to a folder the user picks would close that gap without a server, streaks, or nagging.
