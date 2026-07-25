export type WritingMode = "PROSE" | "SCREENPLAY";

export type FormatTemplate = {
  id: string;
  label: string;
  writingMode: WritingMode;
};

export const FORMAT_TEMPLATES: FormatTemplate[] = [
  { id: "feature-screenplay", label: "Feature Screenplay", writingMode: "SCREENPLAY" },
  { id: "tv-pilot-half-hour", label: "TV Pilot (Half-Hour)", writingMode: "SCREENPLAY" },
  { id: "tv-pilot-hour", label: "TV Pilot (Hour)", writingMode: "SCREENPLAY" },
  { id: "short-story", label: "Short Story", writingMode: "PROSE" },
  { id: "novel-chapter", label: "Novel / Chapter", writingMode: "PROSE" },
  { id: "custom-prose", label: "Custom (Prose)", writingMode: "PROSE" },
  { id: "custom-screenplay", label: "Custom (Screenplay)", writingMode: "SCREENPLAY" },
];

export function templateLabel(formatTemplate: string): string {
  return (
    FORMAT_TEMPLATES.find((t) => t.id === formatTemplate)?.label ??
    formatTemplate
  );
}
