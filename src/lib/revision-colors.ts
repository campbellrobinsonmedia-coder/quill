// Standard industry order for tracking distributed screenplay revisions.
export const REVISION_COLORS = [
  "White",
  "Blue",
  "Pink",
  "Yellow",
  "Green",
  "Goldenrod",
  "Buff",
  "Salmon",
  "Cherry",
] as const;

export function nextRevisionColor(previous: string | null): string {
  if (!previous) return REVISION_COLORS[1]; // first lock skips White (the original draft)
  const idx = REVISION_COLORS.indexOf(previous as (typeof REVISION_COLORS)[number]);
  if (idx === -1) return REVISION_COLORS[1];
  return REVISION_COLORS[(idx + 1) % REVISION_COLORS.length];
}

export const REVISION_COLOR_SWATCH: Record<string, string> = {
  White: "#ffffff",
  Blue: "#bfdbfe",
  Pink: "#fbcfe8",
  Yellow: "#fef08a",
  Green: "#bbf7d0",
  Goldenrod: "#fde68a",
  Buff: "#e7d7b1",
  Salmon: "#fca5a5",
  Cherry: "#f87171",
};
