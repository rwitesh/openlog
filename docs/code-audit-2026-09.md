# Codebase Audit — September 2026

## Scope

This audit covered the application entry points, screens, feature modules, theme and preference system, SQLite access, media/audio/location handling, authentication, notifications, backup/restore, build configuration, Android native project, scripts, dependencies, and existing documentation. Automated checks included TypeScript, Biome, date tests, Expo Doctor, dependency-tree inspection, and `npm audit`.

The audit is static plus build-tool verification. It does not replace device testing on every supported Android/iOS version or a third-party penetration test.

## Changes made

### Native development only

- Installed `expo-dev-client` at the Expo SDK 57-compatible version.
- Changed `npm start` to always start Metro in development-client mode.
- Added explicit Android device, clean-build, Metro, ADB forwarding, and log commands.
- Marked the EAS development profile with `developmentClient: true`.
- Removed all Expo Go detection, disabled-feature branches, special error messages, and Expo Go-only database seeding controls.
- Deleted `scripts/build-apk-local.sh`. It ran destructive `expo prebuild --clean`, rewrote generated Gradle properties with macOS-specific `sed`, built a release binary while naming it “dev,” and mixed build/install concerns. The standard Expo native commands now own this path.

### User-impacting fixes

1. **Media deletion could create permanent broken entries.** Image/audio removal deleted the underlying file before updating SQLite. If the database update failed, the entry still referenced a file that no longer existed. The code now updates SQLite first; the existing post-commit cleanup removes unreferenced files afterward.
2. **Notification permission was requested without context.** Entering the timeline prompted for notifications even though notifications are only used around backup/restore. The startup prompt was removed; permission remains requested at the relevant backup/restore action.
3. **Preference persistence failures were unhandled.** Theme/profile writes could reject without any captured diagnostic. Failures are now reported without including journal content or the profile name.
4. **Expo package drift.** SDK 57 patch dependencies were aligned with Expo Doctor, reducing native/JavaScript mismatch risk.
5. **Known high-severity dependency advisory.** The safe `npm audit fix` upgraded the vulnerable XML parser path. The high-severity advisory is no longer present.

## Remaining risks and recommended improvements

### High priority

1. **Backup restore is not crash-atomic across SQLite and the filesystem.** The implementation rolls back correctly when JavaScript throws, but an OS kill between swapping the media directory and committing SQLite can leave the database and files out of sync. Add a durable restore journal in the documents directory and recover/roll back incomplete restores during bootstrap.
2. **Backup import has no resource ceilings.** A selected archive can expand until device storage is exhausted, and `db.json` is parsed as one in-memory object. Add compressed/uncompressed byte limits, per-file limits, duplicate-path rejection, maximum entry/media counts, and streaming JSON validation/import. This matters most for corrupt or untrusted `.openlog` files.
3. **Very limited automated coverage.** The only executable tests cover date initialization. Add tests for database migrations, cursor pagination, FTS synchronization, entry/media mutation ordering, backup validation/rollback, preference parsing, and authentication state transitions.

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

These paths are transitive; they are not directly called by OpenLog's journal/backup code. Recheck them on every Clerk, Expo, and React Navigation update. Do not use `npm audit fix --force` here because its suggested React Navigation downgrade would likely break the app.

## Privacy observations

- Journal text, locations, attachment names, photos, and audio are not deliberately sent to PostHog.
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
