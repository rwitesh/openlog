# OpenLog — Agent & Engineering Guidelines

## What OpenLog Is

A local-first personal timeline: journal entries, quick notes, photos, voice memos, and kept files — all dated on one continuous chronological spine. It is a tool for whatever the user keeps (journal, notes, life-log), not a social network, not a productivity suite, not a file manager.

---

## 1. Design Psychology

- **Calm software.** The interface protects attention; every element earns its place. Working memory during writing/reflection is ~3–4 items — never add surfaces that compete with thought.
- **Attention Budget:**
  - **Essential** (writing canvas, save, timeline feed) — zero visual competition.
  - **Helpful** (rail, dates, calendar jump) — quiet, low-contrast, peripheral.
  - **Optional** (media, location) — progressive disclosure; never in the writing path.
  - **Distracting** (wallpapers, badges, streaks, interrogative prompts) — eliminated.
- **No extrinsic gamification.** No streaks, guilt nudges, vanity metrics, or engagement hooks. Serendipity (re-encountering the past) over obligation.
- **Warm palette.** Washi Linen light / Nocturne Warm dark (`#141312`, no cold-blue dark mode). The mood accent is reserved for the temporal spine (rail markers) and primary actions only. Metadata and media stay muted.
- **One spine, many lenses.** Everything is an entry on the timeline. Retrieval views (e.g., a media grid) are lenses over the same data — never parallel surfaces or second data models. Deep-link every artifact back to its entry.

## 2. Current Implementation

- **Stack:** Expo / React Native, single `NativeStack` (no tab navigator), `expo-sqlite` (WAL + FTS5), `expo-image`, Clerk (optional auth), PostHog (product analytics only — never content).
- **Layout:** `src/modules/<domain>/{components,hooks,store,utils}`, `src/screens/<screen>`, `src/services/{db,backup,media,audio,fonts,location}`, `src/theme` (tokens + preferences).
- **Entry model** (`src/shared/types/entry.ts`): `id, createdAt, updatedAt, text?, images[], audios[], attachments[], location?`. `attachments` are generic documents (`Attachment` = `{uri, name, mime?, size?}` — PDFs, videos, spreadsheets, anything). Media-only and attachment-only entries are valid (text optional).
- **Timeline:** FlatList → `toTimelineItems` (month dividers, date markers), `TimelineRail` (rail/minimal/clean styles + comfortable/compact density), `EntryRow` (6-line preview + "Read more"), `ImageViewerModal`, `AudioPlayer`.
- **Compose:** view/edit modes; attachments via `useMediaAttachments`; date/time/location badges.
- **Backup:** `.openlog` streaming ZIP (manifest + db.json + media), merge or atomic-replace restore, dry-run inspect. See `docs/BACKUP_SYSTEM_DESIGN.md`.
- **Themes:** `src/theme/tokens.ts` — two base atmospheres, 12 mood accents, WCAG AA/AAA.

## 3. Engineering Principles

- **Code that changes together lives together.** A feature's types, defaults, and schema serialization belong in one cohesive file.
- **The Two-File Rule.** Adding, modifying, or removing a setting/feature touches at most 2 files (domain definition + screen UI).
- **Avoid micro-file sprawl.** Prefer a readable 100–300 line file over 8 disjointed 20-line files. No wrappers or barrels that only re-export.
- **Colocate single-use UI.** Extract shared components only when reused across 2+ distinct surfaces. No single-use double wrapping.
- **Object contracts over positional parameters.** Pass cohesive typed objects (e.g., `preferences`) instead of argument chains.
- **Strict type safety.** `npm run typecheck` must pass with 0 errors. Never use `any`.

## 4. Code Cleanliness

- Self-explanatory code through naming and data flow.
- No decorative comment banners (`/* ----- */`, `// =====`).
- Comments only for non-obvious domain logic, invariants, or intentional constraints.

## 5. Verification (every change)

1. `npm run typecheck` → 0 errors.
2. `npx @biomejs/biome check src` → 0 errors, 0 warnings.
3. Both themes (light + dark) render correctly.
