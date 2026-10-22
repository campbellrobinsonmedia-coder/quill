// Matching the names that appear in a script (character cues, scene-heading
// locations) against the characters and world notes a writer has saved.

// "MARA (V.O.)" and "MARA (CONT'D)" are the same person as "MARA".
export function normalizeCueName(text: string): string {
  let name = text.trim();
  while (/\s*\([^)]*\)\s*$/.test(name)) {
    name = name.replace(/\s*\([^)]*\)\s*$/, "");
  }
  return name.replace(/\s+/g, " ").trim().toUpperCase();
}

// "MARA" -> "Mara", "DR. SMITH" -> "Dr. Smith", "O'BRIEN" -> "O'Brien".
export function titleCaseName(upper: string): string {
  return upper
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
}

export function nameKey(name: string): string {
  return normalizeCueName(name);
}

export function missingFromSaved<T extends { name: string }>(
  scriptRows: T[],
  savedNames: string[]
): T[] {
  const saved = new Set(savedNames.map(nameKey));
  return scriptRows.filter((r) => !saved.has(nameKey(r.name)));
}

export function formatCastStats(row: {
  sceneCount: number;
  lineCount: number;
  dialogueWordCount: number;
  firstScene?: string | null;
}): string {
  const parts = [
    `${row.sceneCount} scene${row.sceneCount === 1 ? "" : "s"}`,
    `${row.lineCount} line${row.lineCount === 1 ? "" : "s"}`,
    `${row.dialogueWordCount} words`,
  ];
  if (row.firstScene) parts.push(`first in scene ${row.firstScene}`);
  return parts.join(" · ");
}

export function formatLocationStats(row: {
  sceneCount: number;
  intCount: number;
  extCount: number;
  dayCount: number;
  nightCount: number;
}): string {
  const parts = [`${row.sceneCount} scene${row.sceneCount === 1 ? "" : "s"}`];
  if (row.intCount) parts.push(`${row.intCount} INT`);
  if (row.extCount) parts.push(`${row.extCount} EXT`);
  if (row.dayCount) parts.push(`${row.dayCount} day`);
  if (row.nightCount) parts.push(`${row.nightCount} night`);
  return parts.join(" · ");
}
