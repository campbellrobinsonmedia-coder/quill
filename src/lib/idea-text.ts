const MAX_TAGS = 10;
const TAG_PATTERN = /(^|\s)#([\p{L}\p{N}_-]{1,30})(?=\s|$|[.,;:!?])/gu;

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#+/, "").toLowerCase();
    if (!/^[\p{L}\p{N}_-]{1,30}$/u.test(tag)) continue;
    seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return Array.from(seen);
}

// "A haunted lighthouse #horror #feature" -> content without the hashtags,
// plus the tags. "# Heading" (hash then space) is left alone.
export function parseIdeaInput(raw: string): { content: string; tags: string[] } {
  const found: string[] = [];
  const stripped = raw.replace(TAG_PATTERN, (_match, lead: string, tag: string) => {
    found.push(tag);
    return lead;
  });
  const content = stripped
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .trim();
  return { content, tags: normalizeTags(found) };
}

// A short working title from the first line of an idea.
export function deriveIdeaTitle(content: string): string {
  const firstLine =
    content
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? "";
  const cleaned = firstLine.replace(/^["'“”‘’\-–—•*]+|["'“”‘’]+$/g, "").trim();
  if (cleaned.length <= 80) return cleaned || "Untitled idea";
  const cut = cleaned.slice(0, 80);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
