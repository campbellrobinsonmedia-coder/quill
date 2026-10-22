import { groupScenes, type ScreenplayElement } from "@/lib/draft-content";

// An outline card is linked to a script scene by the id of the scene's
// heading element. These helpers keep the two orders in step; all are pure.

export function sceneIdsInOrder(elements: ScreenplayElement[]): string[] {
  return elements.filter((el) => el.type === "scene_heading").map((el) => el.id);
}

// Re-sequence the scenes named in `desiredOrder` so they appear in that
// order, reusing the slots those scenes already occupy. Scenes that aren't
// named (no card yet) and any text before the first heading stay where they
// are, so the script never gets reshuffled beyond what the outline says.
export function reorderLinkedScenes(
  elements: ScreenplayElement[],
  desiredOrder: string[]
): ScreenplayElement[] {
  const scenes = groupScenes(elements);
  const byId = new Map(scenes.filter((s) => s.heading).map((s) => [s.heading!.id, s]));
  const desired = Array.from(new Set(desiredOrder)).filter((id) => byId.has(id));
  const desiredSet = new Set(desired);

  const slots: number[] = [];
  scenes.forEach((s, i) => {
    if (s.heading && desiredSet.has(s.heading.id)) slots.push(i);
  });

  const result = [...scenes];
  slots.forEach((slot, k) => {
    result[slot] = byId.get(desired[k])!;
  });
  return result.flatMap((s) => (s.heading ? [s.heading, ...s.body] : s.body));
}

// Move one scene (heading + its body) up or down past its neighbour.
export function moveScene(
  elements: ScreenplayElement[],
  sceneId: string,
  delta: -1 | 1
): ScreenplayElement[] {
  const scenes = groupScenes(elements);
  const index = scenes.findIndex((s) => s.heading?.id === sceneId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= scenes.length) return elements;
  // The headerless preamble is not a movable scene.
  if (!scenes[target].heading) return elements;
  const next = [...scenes];
  [next[index], next[target]] = [next[target], next[index]];
  return next.flatMap((s) => (s.heading ? [s.heading, ...s.body] : s.body));
}

// True when the linked scenes already appear in the script in the same
// relative order as `desiredOrder`.
export function isScriptInOrder(
  elements: ScreenplayElement[],
  desiredOrder: string[]
): boolean {
  const inScript = new Set(sceneIdsInOrder(elements));
  const desired = desiredOrder.filter((id) => inScript.has(id));
  const actual = sceneIdsInOrder(elements).filter((id) => desired.includes(id));
  return desired.length === actual.length && desired.every((id, i) => id === actual[i]);
}

export function findUnlinkedScenes(
  elements: ScreenplayElement[],
  linkedSceneIds: Iterable<string | null>
): { id: string; text: string }[] {
  const linked = new Set(Array.from(linkedSceneIds).filter((id): id is string => !!id));
  return elements
    .filter((el) => el.type === "scene_heading" && !linked.has(el.id))
    .map((el) => ({ id: el.id, text: el.text.trim() }));
}

export function findOrphanedCards<T extends { id: string; linkedSceneId: string | null }>(
  cards: T[],
  elements: ScreenplayElement[]
): T[] {
  const ids = new Set(sceneIdsInOrder(elements));
  return cards.filter((c) => c.linkedSceneId && !ids.has(c.linkedSceneId));
}

// Order a column's cards by where their scenes sit in the script, leaving
// unlinked cards in their current slots.
export function sortCardsByScriptOrder<T extends { id: string; linkedSceneId: string | null }>(
  cards: T[],
  scriptSceneOrder: string[]
): T[] {
  const position = new Map(scriptSceneOrder.map((id, i) => [id, i]));
  const linkedSlots: number[] = [];
  cards.forEach((c, i) => {
    if (c.linkedSceneId && position.has(c.linkedSceneId)) linkedSlots.push(i);
  });
  const sorted = linkedSlots
    .map((i) => cards[i])
    .sort((a, b) => position.get(a.linkedSceneId!)! - position.get(b.linkedSceneId!)!);
  const result = [...cards];
  linkedSlots.forEach((slot, k) => {
    result[slot] = sorted[k];
  });
  return result;
}
