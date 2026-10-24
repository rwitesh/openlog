# OpenLog — Project Guide for Coding Agents

## Product boundary

OpenLog is a local-first personal timeline. People can keep notes, journals, plans, tasks, goals, hobbies, photos, recordings, files, and anything else they choose. Every artifact belongs to one chronological entry; text is optional.

Do not describe, name, or design OpenLog as only a journal, task manager, social network, productivity suite, or file manager. Use neutral terms such as **entry**, **timeline**, **content**, **media**, and **attachment** unless a narrower term is genuinely required by the feature.

## Product principles

- Protect attention. The writing surface and timeline are essential; dates, rail, and calendar navigation are quiet; media and location stay progressive.
- Keep one timeline and many retrieval lenses. A grid, search result, or media view filters the same entries; it never creates a parallel data model.
- Prefer calm, warm, low-contrast UI. Reserve the mood accent for primary actions and the temporal spine. Dark mode is Nocturne Warm (`#141312`), never cold blue.
- Do not add streaks, badges, vanity metrics, guilt prompts, wallpaper-like decoration, or engagement mechanics.
- Treat private content as private. Analytics may record coarse product events, never entry text, attachment names, locations, media, or profile values.

## Engineering rules

- Read the relevant code and follow its established contract before editing. Fix the cause, not only the symptom.
- Keep code that changes together together. Prefer one coherent 100–300 line module over several tiny forwarding files.
- Create a file only when it owns a distinct reusable concept, platform boundary, or independently testable domain rule. Do not create barrels, wrappers, one-function helpers, or test-only production layers.
- Colocate single-use UI. Extract a component only when it serves at least two distinct surfaces.
- Use explicit object-shaped contracts rather than positional argument chains. Keep types strict; never use `any`.
- Name domain concepts accurately and neutrally. Infrastructure names must describe the mechanism or transaction, not imply that all user content is a journal.
- Write comments only for an invariant, intentional trade-off, or non-obvious constraint. Do not narrate obvious code or add decorative banners.
- Preserve local-first behavior. For mutations spanning SQLite and files, commit the database state before destructive cleanup and make recovery deterministic after interruption.
- Make archive, import, and media code defensive: validate untrusted input before mutation, bound resource use, and leave the existing data recoverable on failure.

## Change discipline

- Keep a feature change small and cohesive. Do not use a broad refactor to solve an unrelated problem.
- Preserve public behavior unless the request explicitly changes it. Update types, persistence, UI, and tests together when a contract changes.
- Do not add dependencies or new architecture when a clear local solution exists. For Expo packages, use `npx expo install` so versions match the SDK.
- Do not claim a device-only behavior was verified without running it on a device or emulator.

## Release

This project uses local EAS app versions (`eas.json` sets `appVersionSource` to `local`). Treat the committed `app.json` as the release ledger; never query the stores to choose identifiers. Public versions and native upload identifiers are separate values.

### Preparing a release

- In one change: increment `expo.version` in `app.json` and `version` in `package.json` together, increment `expo.ios.buildNumber` and `expo.android.versionCode` by 1, and add a `<h2>X.Y.Z</h2>` section to `webpage/changelog.html`.
- That changelog section is also the Google Play "What's new" text. Keep it to two or three short, user-facing items in plain language; do not list internal refactors. `scripts/play-release-notes.mjs` converts it and keeps whole items within Play's 500-character limit.
- Run `pnpm expo:doctor` alongside the usual checks and resolve any mismatch before release.

### Publishing Android

`.github/workflows/release-android.yml` publishes to Google Play. After the release change is merged to `main`, pushing a matching tag (`git tag vX.Y.Z && git push origin vX.Y.Z`) runs it. The workflow checks that the tag, `app.json`, and `package.json` agree, runs Expo doctor, tests, typecheck, and Biome, builds the app bundle on EAS, and submits it to the production track for review as release `X.Y.Z (versionCode)`.

- Pushing a release tag submits to production review. Agents push one only when the user asks for it.
- If the run fails before the "Upload to Google Play" step, nothing reached Play and the versionCode is unused: fix on `main`, then move the tag with `git tag -f vX.Y.Z && git push -f origin vX.Y.Z`.
- Once a build is uploaded, its versionCode is spent. Any further store-bound build of the same public version needs `buildNumber` and `versionCode` incremented again first. Never decrement either value.
- A manual run (Actions → Release Android → Run workflow) must start from `main` and defaults to an internal-track draft; it still spends a versionCode.
- Credentials never live in the repo. GitHub holds the `EXPO_TOKEN` secret and the `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_PLAY_SERVICE_ACCOUNT` variables; Google access uses keyless Workload Identity Federation in the `rwiteshbera-personal` project, limited to this repository's `main` branch and `v*` tags.

### Manual EAS builds

iOS and any manual production build still go through EAS directly (`pnpm eas:prod` for Android). Commit the version values first, run `pnpm exec expo config --type public --json` immediately before building, and state the resolved `version`, `ios.buildNumber`, and `android.versionCode` before triggering it.

## Verification

Run the checks that cover the change; for ordinary source changes, run all of these:

```bash
pnpm test
pnpm typecheck
pnpm exec biome check src scripts
```

After dependency or Expo config changes, also run `pnpm expo:doctor`. Also inspect both light and dark themes for UI changes. For native filesystem, permissions, media, or interruption behavior, test on a relevant Android/iOS target when one is available and state clearly when that validation could not be run.
