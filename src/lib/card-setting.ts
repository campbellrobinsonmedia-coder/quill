// The INT./EXT. and time-of-day parts of a scene heading, planned on a card.

export type IntExt = "INT" | "EXT" | "INT/EXT";

export const INT_EXT_OPTIONS: { id: IntExt; label: string }[] = [
  { id: "INT", label: "INT." },
  { id: "EXT", label: "EXT." },
  { id: "INT/EXT", label: "INT./EXT." },
];

export const TIME_SUGGESTIONS = ["DAY", "NIGHT", "MORNING", "EVENING", "DAWN", "DUSK", "LATER", "CONTINUOUS"];

// Accepts "INT", "int.", "INT./EXT.", "I/E" and the like; anything else is none.
export function normalizeIntExt(value: string | null | undefined): IntExt | null {
  const v = (value ?? "").trim().toUpperCase().replace(/\.+$/, "").replace(/\.\//, "/");
  if (v === "INT") return "INT";
  if (v === "EXT") return "EXT";
  if (v === "INT/EXT" || v === "I/E") return "INT/EXT";
  return null;
}

export function normalizeTime(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().replace(/\s+/g, " ").toUpperCase().slice(0, 30);
  return v || null;
}

export function intExtPrefix(value: string | null | undefined): string | null {
  const v = normalizeIntExt(value);
  return v ? INT_EXT_OPTIONS.find((o) => o.id === v)!.label : null;
}
