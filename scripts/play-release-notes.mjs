// Writes the Google Play "What's new" file for one version from webpage/changelog.html.
// Usage: node scripts/play-release-notes.mjs <version> <output-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Google Play rejects release notes longer than 500 characters per language.
const PLAY_NOTES_LIMIT = 500;

const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

export function releaseNotesFor({ html, version }) {
  const sections = html.split(/<h2>/).slice(1);
  const section = sections.find((part) => part.slice(0, part.indexOf("</h2>")).trim() === version);
  if (!section) throw new Error(`No changelog section for ${version} in webpage/changelog.html`);

  const items = [...section.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => {
    const tag = match[1].match(/<span class="changelog-tag[^"]*">([^<]+)<\/span>/)?.[1];
    const text = plainText(match[1].replace(/<span class="changelog-tag[^"]*">[^<]+<\/span>/, ""));
    return tag ? `• ${tag}: ${text}` : `• ${text}`;
  });
  if (items.length === 0) throw new Error(`Changelog section for ${version} has no items`);

  // Keep whole items only; the website changelog stays the complete record.
  const more = "• More fixes and improvements.";
  const kept = [];
  for (const [index, item] of items.entries()) {
    const reserve = index < items.length - 1 ? more.length + 1 : 0;
    if ([...kept, item].join("\n").length + reserve > PLAY_NOTES_LIMIT) break;
    kept.push(item);
  }
  if (kept.length === 0)
    throw new Error(`First changelog item for ${version} exceeds ${PLAY_NOTES_LIMIT} characters`);
  return kept.length < items.length ? [...kept, more].join("\n") : kept.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [version, outputDir] = process.argv.slice(2);
  if (!version || !outputDir)
    throw new Error("Usage: play-release-notes.mjs <version> <output-dir>");
  const html = readFileSync(new URL("../webpage/changelog.html", import.meta.url), "utf8");
  const notes = releaseNotesFor({ html, version });
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "whatsnew-en-US"), `${notes}\n`);
  console.log(notes);
}
