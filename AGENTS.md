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

## Release versioning

This project uses local EAS app versions (`eas.json` sets `appVersionSource` to `local`). Treat `app.json` as the release ledger; no store access is required to choose the next identifiers. Public versions and native upload identifiers are separate values.

- For every patch release, increment `expo.version` in `app.json` and `version` in `package.json` together, add the matching release notes to `webpage/changelog.html`, increment `expo.ios.buildNumber` by 1, and increment `expo.android.versionCode` by 1. Do all four updates in the same change.
- For every subsequent store-bound rebuild of that same public version, increment `expo.ios.buildNumber` and `expo.android.versionCode` by 1 again before building. Never decrement either value after a failed, cancelled, or rejected build.
- Commit the new version values before triggering EAS. The committed `app.json` values are the source of truth for the next release or rebuild; do not query the stores or wait for store access.
- Immediately before an EAS production build, run `pnpm exec expo config --type public --json` and verify the resolved `version`, `ios.buildNumber`, and `android.versionCode`. State those exact values in the handoff before triggering the build. Android `versionCode` can never be reused after an upload.

## Verification

Run the checks that cover the change; for ordinary source changes, run all of these:

```bash
pnpm test
pnpm typecheck
pnpm exec biome check src scripts
```

Also inspect both light and dark themes for UI changes. For native filesystem, permissions, media, or interruption behavior, test on a relevant Android/iOS target when one is available and state clearly when that validation could not be run.

## Commit attribution

Commits with material AI-agent contributions must include a `Co-authored-by` trailer for
the specific agent used. Use the provider's standard identity, for example:

```
Co-authored-by: Codex <codex@openai.com>
Co-authored-by: Claude <noreply@anthropic.com>
Co-authored-by: Cursor <cursoragent@cursor.com>
```
