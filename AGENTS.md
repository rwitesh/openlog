# Agent guide — style & maintainability

This file is about **how we write and change code**, not how features work.

## Tone of the codebase

- Calm, minimal, journal-like. Prefer quiet UI over busy UI.
- Small, focused changes. Do not refactor unrelated code while fixing something.
- Match what is already there before inventing a new pattern.

## Where things go

| Kind of work | Place |
|--------------|-------|
| Business logic, helpers, hooks for logic | `src/lib/` |
| Reusable UI used in more than one feature | `src/components/core/` |
| Feature-specific UI | `src/components/<feature>/` |
| Screens (thin wiring only) | `src/screens/` |
| Theme tokens | `src/theme/` |
| Types | `src/types/` |
| Database | `src/db/` |

Do not put logic in components when it can live in `lib/`.
Do not duplicate UI that already exists in `core/`.

## Naming

**Keep names short. Let the folder carry context.**

- Good: `Row` in `components/entry/`, `Section` in `components/settings/`, `useRecording` in `lib/audio/`
- Bad: `EntryRow`, `SettingsSection`, `useEntrySpeech` — repeating the folder name

**Rules:**

- No redundant prefixes (`Entry*`, `Settings*`, `Audio*` on everything) when the path already says it
- Prefer plain verbs/nouns: `fromComposer`, `formatTime`, `typeLabel`
- One concept, one name — do not alias the same thing two ways
- Export from each folder’s `index.ts`; import from the folder, not deep paths, when possible

## Components

- Screens should stay thin: layout, navigation, wiring hooks — not business rules
- Feature components handle one concern (a row, a composer, a header)
- Shared modals, buttons, players, waveforms belong in `core/`
- Use `ThemedText` and theme tokens — no one-off colors, font sizes, or spacing numbers in components

## Lib

- Pure logic and small hooks live here
- Group by domain: `lib/dates`, `lib/entries`, `lib/audio`
- Re-export from `lib/index.ts` for common imports
- Functions should do one thing and read like plain language

## Fixes & changes

When fixing a bug or adding a small feature:

1. Find the smallest place that owns the behavior
2. Fix there — do not spread the fix across unrelated files
3. Do not rename, restructure, or “improve” adjacent code unless asked
4. Do not add comments for obvious code; only comment non-obvious intent
5. Do not add tests, docs, or tooling unless asked
6. Do not commit unless asked

When adding UI:

- Reuse `core/` and `lib/` first
- Keep copy short and calm (e.g. “Write something…”, not marketing language)
- Prefer subtle motion; avoid flashy animation

## What to avoid

- Duplicating logic under `timeline`, `entry`, and `settings`
- Giant components that mix composing, saving, playback, and layout
- New folders or abstractions for one-off use
- Technical essays in comments or commit messages
- Pushing git changes unless explicitly requested

## Before you finish

- Names still short and consistent with this guide?
- Logic in `lib`, reusable UI in `core`, feature UI in the right feature folder?
- Diff as small as the task allows?
- No unrelated cleanup mixed in?
