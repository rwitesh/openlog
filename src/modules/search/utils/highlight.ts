import { SNIPPET_MARK_END, SNIPPET_MARK_START } from "@/services/db/search";

export interface SnippetSegment {
  key: string;
  text: string;
  highlighted: boolean;
}

/** Splits an FTS snippet on its match markers into styled runs. */
export function splitSnippet(snippet: string): SnippetSegment[] {
  const segments: SnippetSegment[] = [];
  let cursor = 0;
  let highlighted = false;

  while (cursor < snippet.length) {
    const mark = highlighted ? SNIPPET_MARK_END : SNIPPET_MARK_START;
    const at = snippet.indexOf(mark, cursor);
    const text = at === -1 ? snippet.slice(cursor) : snippet.slice(cursor, at);

    if (text) {
      segments.push({
        key: `${cursor}:${highlighted ? "h" : "t"}`,
        text,
        highlighted,
      });
    }
    if (at === -1) break;

    cursor = at + mark.length;
    highlighted = !highlighted;
  }

  return segments;
}

/** True when the snippet contains at least one match marker. */
export function hasSnippetMatch(snippet: string): boolean {
  return snippet.includes(SNIPPET_MARK_START);
}
