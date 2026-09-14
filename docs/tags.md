# Tags

Tags are reusable, colored labels attached to entries. They are part of the same timeline model: a tag only filters or describes existing entries; it does not create a separate kind of content.

## Decision

Use a `tags` table and an `entry_tags` join table. Do not store a JSON tag list in `entries`.

A join table keeps one source of truth for a tag's name and color. Renaming or recoloring a tag updates every attached entry automatically, while removing a tag from one entry changes only that relationship.

This is a test environment, so update the schema directly. No database migration is needed.

## Schema

```sql
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  key        TEXT NOT NULL UNIQUE,
  color_id   TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_entry
  ON entry_tags (tag_id, entry_id);
```

`key` is a normalized form of `name`, used only to prevent duplicates. Create it by trimming whitespace, collapsing internal whitespace, normalizing Unicode, and lowercasing. For example, `"  Weekend   plans "` has `name = "Weekend plans"` and `key = "weekend plans"`.

`color_id` is a palette value such as `clay`, `sage`, `violet`, or `teal`. Store the identifier rather than a hex value so the tag remains legible in both light and Nocturne Warm themes.

## Behavior

- Creating a tag saves one reusable tag record.
- Attaching a tag inserts one `entry_tags` row.
- Removing an attached tag deletes only that row.
- Renaming or recoloring a tag updates its one `tags` row, so every entry reflects it immediately.
- Deleting an entry removes its tag links through the foreign-key cascade. Tags remain reusable.
- Deleting a tag removes its links through the cascade, but never deletes entries.
- Existing tags with no attached entries remain available for reuse.

Prevent duplicate attachments with the composite primary key. Prevent duplicate tag names with the unique `key` column. If a person enters an existing tag name in the picker, select that tag instead of creating another one.

## Entry contract

```ts
interface Tag {
  id: string;
  name: string;
  colorId: TagColorId;
}

interface Entry {
  // existing fields
  tags: Tag[];
}

interface NewEntryInput {
  // existing fields
  tagIds?: string[];
}

interface UpdateEntryInput {
  // existing fields
  tagIds?: string[];
}
```

When an entry is loaded, join its tag records and return `tags` in a stable order, such as tag name. When saving an entry, replace its `entry_tags` rows inside the same SQLite transaction as the entry update.

## Interface

In the editor, place a quiet **Tags** control beside the existing date and location metadata. It opens a searchable sheet:

- Existing tags use a colored dot, name, and checkmark when attached.
- Typing a new valid name offers **Create “name”** and then asks for a palette color.
- Selected tags appear as compact chips; the × removes only that tag from the current entry.
- A **Manage tags** action supports rename, recolor, and delete.

Show attached tags as a restrained chip row in the timeline and entry view. They should be readable but secondary to the entry's text and media.

Search should include tag names. A matching tag can open the same timeline filtered to entries linked to that tag; it is a retrieval lens, not a second timeline.

## Limits and privacy

- Limit tag names to 10 characters and tags per entry to 10.
- Do not allow a tag alone to make an otherwise empty entry saveable.
- Include tags and entry-tag links in backup export and restore them in the same database transaction as entries.
- Analytics may record coarse events such as `tag_created` and `tag_attached`; it must never include tag names, colors, or search text.
