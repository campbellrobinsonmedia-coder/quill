export type ScreenplayElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition";

export type ScreenplayElement = {
  id: string;
  type: ScreenplayElementType;
  text: string;
};

export type ProseContent = {
  type: "prose";
  text: string;
};

export type ScreenplayContent = {
  type: "screenplay";
  elements: ScreenplayElement[];
};

export type DraftContent = ProseContent | ScreenplayContent;

export function createEmptyContent(writingMode: "PROSE" | "SCREENPLAY"): DraftContent {
  if (writingMode === "PROSE") {
    return { type: "prose", text: "" };
  }
  return {
    type: "screenplay",
    elements: [{ id: makeId(), type: "scene_heading", text: "" }],
  };
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function countWords(content: DraftContent): number {
  const text =
    content.type === "prose"
      ? content.text
      : content.elements.map((el) => el.text).join(" ");
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

// Rough approximation of the "1 page ~ 1 minute" screenplay convention.
// Weighted by element type, mirroring how much vertical space each takes
// on a standard 12pt Courier page (~55 content lines/page).
const LINES_PER_PAGE = 55;
const ACTION_CHARS_PER_LINE = 60;
const DIALOGUE_CHARS_PER_LINE = 35;

export function estimateScreenplayPageCount(content: ScreenplayContent): number {
  let lines = 0;
  for (const el of content.elements) {
    const len = el.text.length;
    switch (el.type) {
      case "scene_heading":
        lines += 2; // heading + blank line after
        break;
      case "action":
        lines += Math.max(1, Math.ceil(len / ACTION_CHARS_PER_LINE)) + 1;
        break;
      case "character":
        lines += 1;
        break;
      case "parenthetical":
        lines += 1;
        break;
      case "dialogue":
        lines += Math.max(1, Math.ceil(len / DIALOGUE_CHARS_PER_LINE)) + 1;
        break;
      case "transition":
        lines += 2;
        break;
    }
  }
  return Math.max(0, Math.round((lines / LINES_PER_PAGE) * 10) / 10);
}

export function estimateProsePageCount(content: ProseContent): number {
  // ~250 words/page, a common manuscript-page convention.
  const words = countWords(content);
  return Math.max(0, Math.round((words / 250) * 10) / 10);
}

export function estimatePageCount(content: DraftContent): number {
  return content.type === "screenplay"
    ? estimateScreenplayPageCount(content)
    : estimateProsePageCount(content);
}

export const SCREENPLAY_TAB_CYCLE: ScreenplayElementType[] = [
  "scene_heading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
];

export function nextTabType(current: ScreenplayElementType): ScreenplayElementType {
  const idx = SCREENPLAY_TAB_CYCLE.indexOf(current);
  return SCREENPLAY_TAB_CYCLE[(idx + 1) % SCREENPLAY_TAB_CYCLE.length];
}

export function prevTabType(current: ScreenplayElementType): ScreenplayElementType {
  const idx = SCREENPLAY_TAB_CYCLE.indexOf(current);
  return SCREENPLAY_TAB_CYCLE[
    (idx - 1 + SCREENPLAY_TAB_CYCLE.length) % SCREENPLAY_TAB_CYCLE.length
  ];
}

// What Enter defaults to next, mirroring Final Draft's standard behavior.
export function nextEnterType(current: ScreenplayElementType): ScreenplayElementType {
  switch (current) {
    case "scene_heading":
      return "action";
    case "action":
      return "action";
    case "character":
      return "dialogue";
    case "parenthetical":
      return "dialogue";
    case "dialogue":
      return "character";
    case "transition":
      return "scene_heading";
  }
}

export const ELEMENT_LABELS: Record<ScreenplayElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};
