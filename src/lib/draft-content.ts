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
  // scene_heading only: explicit number once the draft's scene numbers are
  // locked. Undefined/null means "auto-number sequentially" (unlocked).
  sceneNumber?: string | null;
  // scene_heading only: scene is marked OMITTED but keeps its number
  // reserved, rather than being deleted outright.
  omitted?: boolean;
  // character/parenthetical/dialogue: elements sharing a dualGroup id are
  // simultaneous dialogue, rendered side-by-side.
  dualGroup?: string | null;
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

export function createSampleContent(writingMode: "PROSE" | "SCREENPLAY"): DraftContent {
  if (writingMode === "PROSE") {
    return {
      type: "prose",
      text: "The rain hadn't let up since morning, and Mara was starting to think it never would.\n\nShe pulled her coat tighter and kept walking. Whatever waited for her at the harbor could wait a little longer — but not much longer than that.",
    };
  }
  return {
    type: "screenplay",
    elements: [
      { id: makeId(), type: "scene_heading", text: "INT. HARBOR OFFICE - NIGHT" },
      { id: makeId(), type: "action", text: "Rain streaks the window. MARA VOSS, 30s, unreadable, studies a chart pinned to the wall." },
      { id: makeId(), type: "character", text: "MARA" },
      { id: makeId(), type: "dialogue", text: "Whatever's out there, it's not waiting for good weather." },
    ],
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

// Auto-numbers scenes 1,2,3... when unlocked. Once locked, existing scene
// headings keep their persisted sceneNumber, and any scene inserted after
// locking gets a letter suffix off the nearest preceding locked number
// (24, 24A, 24B, 25...) instead of renumbering everything.
export function computeSceneNumbers(
  elements: ScreenplayElement[],
  locked: boolean
): Map<string, string> {
  const numbers = new Map<string, string>();
  const headings = elements.filter((el) => el.type === "scene_heading");

  if (!locked) {
    headings.forEach((el, i) => numbers.set(el.id, String(i + 1)));
    return numbers;
  }

  let lastLocked = "0";
  let suffixCount = 0;
  for (const el of headings) {
    if (el.sceneNumber) {
      numbers.set(el.id, el.sceneNumber);
      lastLocked = el.sceneNumber;
      suffixCount = 0;
    } else {
      suffixCount += 1;
      const suffix = String.fromCharCode(64 + suffixCount); // A, B, C...
      numbers.set(el.id, `${lastLocked}${suffix}`);
    }
  }
  return numbers;
}

export type Scene = {
  heading: ScreenplayElement | null;
  body: ScreenplayElement[];
};

// Groups a flat element list into scenes (heading + everything until the
// next scene_heading). Elements before the first heading, if any, form a
// headerless preamble scene.
export function groupScenes(elements: ScreenplayElement[]): Scene[] {
  const scenes: Scene[] = [];
  let current: Scene | null = null;
  for (const el of elements) {
    if (el.type === "scene_heading") {
      current = { heading: el, body: [] };
      scenes.push(current);
    } else {
      if (!current) {
        current = { heading: null, body: [] };
        scenes.push(current);
      }
      current.body.push(el);
    }
  }
  return scenes;
}

export type SceneOption = { id: string; label: string };

// Lightweight list of scene headings for linking an outline card to a scene
// in the draft, independent of lock state or omitted status.
export function listScenes(content: DraftContent): SceneOption[] {
  if (content.type !== "screenplay") return [];
  const numbers = computeSceneNumbers(content.elements, false);
  return content.elements
    .filter((el) => el.type === "scene_heading")
    .map((el) => ({
      id: el.id,
      label: `${numbers.get(el.id) ?? "?"}. ${el.text.trim() || "Untitled scene"}`,
    }));
}

export const ELEMENT_LABELS: Record<ScreenplayElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};
