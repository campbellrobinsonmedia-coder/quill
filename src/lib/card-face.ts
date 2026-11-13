import { intExtPrefix, normalizeTime } from "@/lib/card-setting";

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
// otherwise what the writer planned: "INT. LAMP ROOM - NIGHT", built from
// whichever of those parts they've filled in.
export function cardHeading(opts: {
  sceneLabel?: string | null;
  location?: string | null;
  intExt?: string | null;
  timeOfDay?: string | null;
}): string | null {
  const fromScript = sceneHeadingFromLabel(opts.sceneLabel);
  if (fromScript) return fromScript;
  const prefix = intExtPrefix(opts.intExt);
  const time = normalizeTime(opts.timeOfDay);
  const loc = opts.location?.trim().toUpperCase();
  if (!loc) return [prefix, time].filter(Boolean).join(" \u00b7 ") || null;
  return `${prefix ? `${prefix} ` : ""}${loc}${time ? ` - ${time}` : ""}`;
}

// The scene heading a new script scene starts with when it's made from a card.
// The writer's location becomes the heading, with the INT./EXT. and time they
// planned on the card. Anything they left empty falls back to the usual guess
// (INT., DAY), one keystroke to change. With no location it's left to fill in.
export function headingForCard(
  location: string | null | undefined,
  intExt?: string | null,
  timeOfDay?: string | null
): string {
  const prefix = intExtPrefix(intExt) ?? "INT.";
  const loc = location?.trim().toUpperCase();
  if (!loc) return `${prefix} `;
  if (/^(INT\.\/EXT\.|INT\/EXT\.|I\/E\.|INT\.|EXT\.|EST\.)\s/.test(loc)) return loc;
  return `${prefix} ${loc} - ${normalizeTime(timeOfDay) ?? "DAY"}`;
}
