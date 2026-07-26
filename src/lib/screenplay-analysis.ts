import { computeSceneNumbers, groupScenes, type ScreenplayContent } from "@/lib/draft-content";

export type SceneReportRow = {
  number: string;
  prefix: string;
  location: string;
  time: string;
  omitted: boolean;
  characters: string[];
  wordCount: number;
};

export type LocationReportRow = {
  location: string;
  sceneCount: number;
  intCount: number;
  extCount: number;
  dayCount: number;
  nightCount: number;
  otherTimeCount: number;
};

export type CharacterReportRow = {
  name: string;
  sceneCount: number;
  lineCount: number;
  dialogueWordCount: number;
};

const HEADING_RE =
  /^(INT\.\/EXT\.|INT\/EXT\.|I\/E\.|INT\.|EXT\.|EST\.)?\s*(.*?)(?:\s*-\s*(.*))?$/i;

function parseSceneHeading(text: string): { prefix: string; location: string; time: string } {
  const match = text.match(HEADING_RE);
  if (!match) return { prefix: "", location: text.trim(), time: "" };
  return {
    prefix: (match[1] ?? "").toUpperCase().replace(/\.$/, "").trim(),
    location: (match[2] ?? "").trim(),
    time: (match[3] ?? "").trim().toUpperCase(),
  };
}

function isDay(time: string): boolean {
  return /DAY|MORNING|DAWN/.test(time);
}

function isNight(time: string): boolean {
  return /NIGHT|DUSK|EVENING/.test(time);
}

export function buildSceneReport(content: ScreenplayContent): SceneReportRow[] {
  const numbers = computeSceneNumbers(content.elements, true);
  const scenes = groupScenes(content.elements);

  return scenes
    .filter((s) => s.heading)
    .map((s) => {
      const heading = s.heading!;
      const { prefix, location, time } = parseSceneHeading(heading.text);
      const characters = Array.from(
        new Set(s.body.filter((e) => e.type === "character" && e.text.trim()).map((e) => e.text.trim()))
      );
      const wordCount = s.body.reduce(
        (sum, e) => sum + (e.text.trim().match(/\S+/g)?.length ?? 0),
        0
      );
      return {
        number: numbers.get(heading.id) ?? "",
        prefix,
        location: location || "(unspecified)",
        time: time || "—",
        omitted: !!heading.omitted,
        characters,
        wordCount,
      };
    });
}

export function buildLocationReport(sceneRows: SceneReportRow[]): LocationReportRow[] {
  const byLocation = new Map<string, LocationReportRow>();
  for (const row of sceneRows) {
    if (row.omitted) continue;
    const existing = byLocation.get(row.location) ?? {
      location: row.location,
      sceneCount: 0,
      intCount: 0,
      extCount: 0,
      dayCount: 0,
      nightCount: 0,
      otherTimeCount: 0,
    };
    existing.sceneCount += 1;
    if (row.prefix.startsWith("INT")) existing.intCount += 1;
    if (row.prefix.startsWith("EXT")) existing.extCount += 1;
    if (isDay(row.time)) existing.dayCount += 1;
    else if (isNight(row.time)) existing.nightCount += 1;
    else existing.otherTimeCount += 1;
    byLocation.set(row.location, existing);
  }
  return Array.from(byLocation.values()).sort((a, b) => b.sceneCount - a.sceneCount);
}

export function buildCharacterReport(
  content: ScreenplayContent,
  sceneRows: SceneReportRow[]
): CharacterReportRow[] {
  const byName = new Map<string, CharacterReportRow>();

  function ensure(name: string): CharacterReportRow {
    const key = name.trim().toUpperCase();
    const existing = byName.get(key);
    if (existing) return existing;
    const fresh = { name: name.trim(), sceneCount: 0, lineCount: 0, dialogueWordCount: 0 };
    byName.set(key, fresh);
    return fresh;
  }

  for (const row of sceneRows) {
    if (row.omitted) continue;
    for (const name of row.characters) {
      ensure(name).sceneCount += 1;
    }
  }

  let currentCharacter: string | null = null;
  for (const el of content.elements) {
    if (el.type === "character" && el.text.trim()) {
      currentCharacter = el.text.trim();
    } else if (el.type === "dialogue" && currentCharacter) {
      const row = ensure(currentCharacter);
      row.lineCount += 1;
      row.dialogueWordCount += el.text.trim().match(/\S+/g)?.length ?? 0;
    }
  }

  return Array.from(byName.values()).sort((a, b) => b.lineCount - a.lineCount);
}
