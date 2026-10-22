// Small helpers for how an outline card reads at a glance.

// The scene-picker labels look like "3. INT. ATTIC - DAY"; the card shows just
// the heading.
export function sceneHeadingFromLabel(label: string | undefined | null): string | null {
  if (!label) return null;
  const heading = label.replace(/^\d+[A-Z]*\.\s*/, "").trim();
  return heading || null;
}

// "Mara Voss" -> "MV", "Eli" -> "E", "Dr. Smith" -> "DS"
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, "")[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return letters.toUpperCase() || "?";
}

export function splitCharacters<T>(items: T[], max: number): { shown: T[]; extra: number } {
  return { shown: items.slice(0, max), extra: Math.max(0, items.length - max) };
}

// The line above a card's title: the linked scene's heading when there is one,
// otherwise the location the writer typed.
export function cardHeading(opts: {
  sceneLabel?: string | null;
  location?: string | null;
}): string | null {
  return sceneHeadingFromLabel(opts.sceneLabel) ?? (opts.location?.trim().toUpperCase() || null);
}
