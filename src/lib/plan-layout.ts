// The Plan board is a set of columns: one per beat, plus an "unplanned"
// column for scenes that haven't been placed under a beat. Everything here is
// pure so the drag-and-drop behavior can be tested without a browser.

export const UNPLANNED = "unplanned";

export type PlanLayout = {
  beatIds: string[];
  columns: Record<string, string[]>;
};

export function buildLayout(
  beats: { id: string; order: number }[],
  cards: { id: string; beatId: string | null; order: number }[]
): PlanLayout {
  const beatIds = [...beats].sort((a, b) => a.order - b.order).map((b) => b.id);
  const known = new Set(beatIds);
  const columns: Record<string, string[]> = { [UNPLANNED]: [] };
  for (const id of beatIds) columns[id] = [];

  for (const card of [...cards].sort((a, b) => a.order - b.order)) {
    const col = card.beatId && known.has(card.beatId) ? card.beatId : UNPLANNED;
    columns[col].push(card.id);
  }
  return { beatIds, columns };
}

export function columnOf(layout: PlanLayout, cardId: string): string | null {
  for (const [col, ids] of Object.entries(layout.columns)) {
    if (ids.includes(cardId)) return col;
  }
  return null;
}

export function moveCard(
  layout: PlanLayout,
  cardId: string,
  toColumn: string,
  toIndex?: number
): PlanLayout {
  if (!(toColumn in layout.columns)) return layout;
  const from = columnOf(layout, cardId);
  if (from === null) return layout;

  const columns: Record<string, string[]> = {};
  for (const [col, ids] of Object.entries(layout.columns)) {
    columns[col] = ids.filter((id) => id !== cardId);
  }
  const target = columns[toColumn];
  const index = toIndex === undefined ? target.length : Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, cardId);
  return { beatIds: layout.beatIds, columns };
}

export function moveBeat(layout: PlanLayout, beatId: string, toIndex: number): PlanLayout {
  const from = layout.beatIds.indexOf(beatId);
  if (from < 0) return layout;
  const beatIds = layout.beatIds.filter((id) => id !== beatId);
  beatIds.splice(Math.max(0, Math.min(toIndex, beatIds.length)), 0, beatId);
  return { beatIds, columns: layout.columns };
}

// Story order: unplanned scenes first, then each beat's scenes in beat order.
export function flattenLayout(layout: PlanLayout): string[] {
  return [
    ...layout.columns[UNPLANNED],
    ...layout.beatIds.flatMap((id) => layout.columns[id] ?? []),
  ];
}

export function cardNumbers(layout: PlanLayout): Map<string, number> {
  return new Map(flattenLayout(layout).map((id, i) => [id, i + 1]));
}

// What the server needs to persist the board.
export function serializeLayout(layout: PlanLayout) {
  return {
    beatIds: layout.beatIds,
    columns: [UNPLANNED, ...layout.beatIds].map((col) => ({
      beatId: col === UNPLANNED ? null : col,
      cardIds: layout.columns[col] ?? [],
    })),
  };
}
