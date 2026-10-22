import { UNPLANNED, type PlanLayout } from "@/lib/plan-layout";

// The Lanes view: rows are storylines (or characters), columns are scenes in
// story order, so you can see where a thread goes quiet.

export type LaneCard = {
  id: string;
  storyThread: string | null;
  characters: { id: string; name: string }[];
};

export type Lane<T> = {
  key: string;
  label: string;
  /** one entry per scene in story order; null where this lane isn't in the scene */
  cells: (T | null)[];
};

export const NO_THREAD = "—";

export function buildThreadLanes<T extends LaneCard>(ordered: T[]): Lane<T>[] {
  const keys: string[] = [];
  for (const c of ordered) {
    const k = c.storyThread?.trim().toUpperCase() || NO_THREAD;
    if (!keys.includes(k)) keys.push(k);
  }
  // Named storylines alphabetically, scenes with no storyline last.
  keys.sort((a, b) => (a === NO_THREAD ? 1 : b === NO_THREAD ? -1 : a.localeCompare(b)));
  return keys.map((key) => ({
    key,
    label: key === NO_THREAD ? "No storyline" : `Storyline ${key}`,
    cells: ordered.map((c) => ((c.storyThread?.trim().toUpperCase() || NO_THREAD) === key ? c : null)),
  }));
}

export function buildCharacterLanes<T extends LaneCard>(ordered: T[]): Lane<T>[] {
  const names = new Map<string, string>();
  for (const c of ordered) for (const ch of c.characters) names.set(ch.id, ch.name);
  const lanes = Array.from(names, ([id, name]) => ({
    key: id,
    label: name,
    cells: ordered.map((c) => (c.characters.some((ch) => ch.id === id) ? c : null)),
  }));
  // Busiest characters first.
  return lanes.sort(
    (a, b) =>
      b.cells.filter(Boolean).length - a.cells.filter(Boolean).length || a.label.localeCompare(b.label)
  );
}

// Where each beat starts and how many scenes it covers, for the header strip.
export function beatSpans(
  layout: PlanLayout,
  beatTitle: (id: string) => string
): { key: string; label: string; count: number }[] {
  const spans = [{ key: UNPLANNED, label: layout.beatIds.length ? "Unplanned" : "Scenes", count: layout.columns[UNPLANNED].length }];
  for (const id of layout.beatIds) {
    spans.push({ key: id, label: beatTitle(id), count: (layout.columns[id] ?? []).length });
  }
  return spans.filter((s) => s.count > 0);
}
