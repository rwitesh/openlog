# Codebase Audit — September 2026

## Scope

This audit covered the application entry points, screens, feature modules, theme and preference system, SQLite access, media/audio/location handling, authentication, notifications, backup/restore, build configuration, Android native project, scripts, dependencies, and existing documentation. Automated checks included TypeScript, Biome, date tests, Expo Doctor, dependency-tree inspection, and `npm audit`.

The audit is static plus build-tool verification. It does not replace device testing on every supported Android/iOS version or a third-party penetration test.

## Resolution status

The five findings below are already resolved in the current codebase. The three originally high-priority findings have since been partially or fully remediated as recorded below; the remaining test gaps are explicitly retained rather than treated as complete coverage.

### Resolved user-impacting findings

### Native development only

- Installed `expo-dev-client` at the Expo SDK 57-compatible version.
- Changed `npm start` to always start Metro in development-client mode.
- Added explicit Android device, clean-build, Metro, ADB forwarding, and log commands.
- Marked the EAS development profile with `developmentClient: true`.
- Removed all Expo Go detection, disabled-feature branches, special error messages, and Expo Go-only database seeding controls.
- Deleted `scripts/build-apk-local.sh`. It ran destructive `expo prebuild --clean`, rewrote generated Gradle properties with macOS-specific `sed`, built a release binary while naming it “dev,” and mixed build/install concerns. The standard Expo native commands now own this path.

1. **Media deletion could create permanent broken entries.** Image/audio removal deleted the underlying file before updating SQLite. If the database update failed, the entry still referenced a file that no longer existed. The code now updates SQLite first; the existing post-commit cleanup removes unreferenced files afterward.
2. **Notification permission was requested without context.** Entering the timeline prompted for notifications even though notifications are only used around backup/restore. The startup prompt was removed; permission remains requested at the relevant backup/restore action.
3. **Preference persistence failures were unhandled.** Theme/profile writes could reject without any captured diagnostic. Failures are now reported without including entry content or the profile name.
4. **Expo package drift.** SDK 57 patch dependencies were aligned with Expo Doctor, reducing native/JavaScript mismatch risk.
5. **Known high-severity dependency advisory.** The safe `npm audit fix` upgraded the vulnerable XML parser path. The high-severity advisory is no longer present.

## Follow-up remediation and remaining risks

### Implementation record

The follow-up work kept the timeline model intact and focused on correctness, recoverability, and testability:

| Area | Change | Outcome |
|---|---|---|
| Entry media removal | Entry updates commit to SQLite before unreferenced media cleanup is scheduled. | A failed database update cannot leave an entry referring to a removed file. |
| Notifications | Permission requests are limited to the backup export and restore actions that use progress notifications. | Opening the timeline never triggers an unrelated system permission prompt. |
| Preferences and profile | Failed persistence is reported through sanitized diagnostics without recording entry content or a profile value. | Write failures are observable without exposing private data. |
| Restore recovery | A durable `restore-transaction` record in Documents tracks the media handoff; a matching SQLite marker is written inside the imported-entry transaction. Bootstrap resolves an unfinished transaction before normal reads. | An interruption during replace restore deterministically keeps the committed data or restores the prior media directory. |
| Archive import | The importer caps archive, expanded, member, manifest, database, entry, and item counts; rejects duplicate or unexpected paths; stages media; and incrementally parses `db.json`. | Corrupt or hostile backups cannot silently overwrite staged files or consume unbounded storage and memory. |
| Test suite | Node tests now cover schema migration, FTS triggers, cursor ordering, media-update ordering, backup validation and recovery decisions, preference parsing, and welcome/auth transitions. | `npm test` runs 22 focused checks instead of date initialization alone. |
| Agent guidance | `AGENTS.md` and `GEMINI.md` define a neutral personal-timeline model, cohesive-file rule, naming guidance, privacy constraints, and verification expectations. | Future changes should not narrow the product to a journal or reintroduce micro-file sprawl. |

### Release version

This follow-up is staged as **1.3.1**. Because EAS uses local app versions, the next production build uses iOS build number **7** and Android version code **7**. These values must be increased again before another store submission.

### High priority — implemented and verified

1. **Crash-atomic backup restore.** A durable restore transaction record is written in the documents directory before the media/database handoff. Bootstrap recovery uses that record plus a SQLite commit marker to either finalize a committed restore or restore the prior media directory after an interrupted handoff.
2. **Bounded backup import.** Import now limits archive, expanded, member, manifest, database, and individual-entry sizes; rejects duplicate and unexpected paths; caps entries and media; streams archive input to staged files; and incrementally parses `db.json` entries rather than loading its entry list as one object.
3. **Automated coverage expanded.** Executable tests now exercise database migration, cursor pagination, FTS insert/update/delete synchronization, entry/media mutation ordering, backup validation and rollback/recovery, persisted-preference parsing, and authentication state transitions.

Validation evidence for this status: the restore transaction record is created before media replacement and read during database bootstrap; the import path enforces the stated ceilings while reading the archive and streams entry decoding from staged `db.json`; the automated suite covers migration, pagination, FTS synchronization, entry/media mutation ordering, backup validation and rollback/recovery, preference parsing, and authentication state transitions. The entry store still persists media changes before scheduling unreferenced-file cleanup; notification permission requests remain confined to the notification/backup flow; preference and profile persistence rejection paths report sanitized diagnostics; `package.json` uses Expo SDK 57-compatible package ranges; and the prior high-severity XML-parser advisory remains absent after the safe audit update.

Remaining validation work: device-level interruption testing is still needed to validate restore recovery under an actual OS kill.

### Medium priority

1. **Timeline database failures have no user recovery surface.** Initial/paginated queries use `finally` but do not catch errors. A read failure can result in an empty timeline or an unhandled rejection. Expose an error state with a quiet retry action and report sanitized diagnostics.
2. **Optimistic settings can still revert after restart.** Persistence failures are now captured, but UI state remains optimistic. Queue preference writes and surface a small “Couldn’t save this setting” message or roll back only when the failed write is still the latest value.
3. **Media cleanup failures leave orphan files.** Post-commit deletion intentionally favors preventing data loss, but failed deletes only produce a development warning. Maintain a retry queue or periodically remove files not referenced by SQLite.
4. **The entry cache is unbounded.** Long sessions that open many entries can retain every opened object. Cap it with a small LRU cache.
5. **Backup integrity is structural, not cryptographic.** Counts detect some corruption but not byte-level tampering or missing archive members. Store SHA-256 hashes in a new archive schema version and verify before committing a restore.

### Dependency advisories

After the safe audit fix, npm reports moderate transitive advisories:

- `decode-uri-component` through React Navigation's `query-string` dependency. npm's proposed forced fix incorrectly downgrades React Navigation to a breaking major, so it was not applied.
- `stream-json` and an old nested `uuid` through Clerk's Solana wallet dependency tree. No compatible upstream fix is currently exposed in this dependency graph.
- an old nested `uuid` through Expo config tooling. No compatible upstream fix is currently exposed in this dependency graph.

These paths are transitive; they are not directly called by OpenLog's entry or backup code. Recheck them on every Clerk, Expo, and React Navigation update. Do not use `npm audit fix --force` here because its suggested React Navigation downgrade would likely break the app.

## Privacy observations

- Entry text, locations, attachment names, photos, and audio are not deliberately sent to PostHog.
- Analytics include coarse event metadata such as media counts, durations, screen names, and backup byte/entry counts.
- Authentication is optional in the current beta configuration, while local biometric lock is independent of Clerk.
- `.env` and signing-key patterns are ignored; `.env.example` contains placeholders only.

## Verification record

Run the following after any follow-up implementation:

```bash
npm run typecheck
npx @biomejs/biome check src
npm test
npx expo-doctor
npm audit --omit=dev
```

Light and dark theme definitions were reviewed statically. Final visual confirmation still requires rendering both themes on a native device/emulator.
