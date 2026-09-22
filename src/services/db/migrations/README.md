# OpenLog database migrations

> **Plain rule:** the database begins at v1 today. When its shape changes in the future, add one small forward step—v2, then v3, and so on. Do not rewrite history.

## The map

```text
db/
├── schema.ts                 ← runs migrations in order; owns the current version
└── migrations/
    ├── README.md             ← you are here
    ├── v1.ts                 ← the complete fresh-install baseline
    ├── v2.ts                 ← the next database-shape change
    └── v3.ts                 ← the change after that
```

`v1.ts` describes a new OpenLog database exactly as it exists now. It is the starting line, not a record of older experiments. Leave it unchanged after it ships.

## What counts as a migration?

Make a migration when changing the **database shape**:

- adding, removing, or renaming a table or column;
- adding an index, constraint, trigger, or FTS structure;
- moving or converting values already stored in SQLite.

Changing TypeScript code, UI text, or a query without changing stored data does **not** need a migration.

## The next time the schema changes

Imagine entries need an optional `archived_at` timestamp.

### 1. Add one new file

Create `v2.ts`. It only explains how to move **v1 → v2**.

```ts
import type { SchemaDatabase } from "../schema.ts";

export async function migrateToV2(db: SchemaDatabase, schema: string): Promise<void> {
  await db.execAsync(`ALTER TABLE ${schema}.entries ADD COLUMN archived_at INTEGER`);
}
```

The `schema` argument is normally `main` when OpenLog starts. Use it rather than assuming `main`, so migrations remain reusable and testable.

### 2. Register it once

In `../schema.ts`, add it after v1:

```ts
import { migrateToV2 } from "./migrations/v2.ts";

const MIGRATIONS: readonly DatabaseMigration[] = [
  { version: 1, up: migrateToV1 },
  { version: 2, up: migrateToV2 },
];
```

That is the only version number you add. `DATABASE_SCHEMA_VERSION` automatically becomes `2` because it is derived from the last registered migration.

### 3. Update the rest of the contract

Update the row type, reads/writes, and `validation.ts` for the new final schema. Add a test that begins with a v1 database and proves it becomes v2 with its data intact.

## What OpenLog does for you

1. It reads SQLite’s `PRAGMA user_version`.
2. It runs each missing migration in order inside a transaction, with foreign keys off so table rebuilds stay possible (never toggle that pragma in a migration — SQLite ignores it inside a transaction).
3. It writes the new version number only when that migration succeeds.
4. It re-enables `PRAGMA foreign_keys = ON` after the last migration.
5. Restore validates its archive before replacing local rows.

So if v2 fails, the database stays at its prior schema version. A backup made by a newer future version is rejected; OpenLog never tries to downgrade it.

## Safety rules

- **Never edit, delete, or renumber** a released `vN.ts` file.
- **Never put two unrelated schema changes** into the same migration if they could be reviewed separately.
- **Never make a migration depend on app state or the network.** It must work from the database alone.
- **Always test upgrade paths**: fresh install → current and v1 → current.

This keeps the folder boring on purpose: one file per irreversible step, a visible order, and no hidden version number to synchronize.
