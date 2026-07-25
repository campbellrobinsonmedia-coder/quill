export const OUTLINE_COLORS = [
  { id: "neutral", label: "None", swatch: "#d4d4d4" },
  { id: "red", label: "Red", swatch: "#ef4444" },
  { id: "orange", label: "Orange", swatch: "#f97316" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "emerald", label: "Green", swatch: "#10b981" },
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "pink", label: "Pink", swatch: "#ec4899" },
] as const;

export function swatchFor(colorTag: string | null | undefined): string {
  return OUTLINE_COLORS.find((c) => c.id === colorTag)?.swatch ?? "#d4d4d4";
}
