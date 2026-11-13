// Scenes and beats can be put aside without deleting them: a scene "set aside"
// stays on the board greyed out, and an archived beat leaves the board with its
// scenes. A "gap" is a placeholder for a scene still to be found. None of these
// count towards progress, numbering or printouts as real scenes.

type AsideCard = { parked?: boolean | null; gap?: boolean | null; beatId?: string | null };

export function isSetAside(card: AsideCard, archivedBeatIds?: ReadonlySet<string>): boolean {
  return !!card.parked || !!card.gap || (!!card.beatId && !!archivedBeatIds?.has(card.beatId));
}

export function withoutSetAside<T extends AsideCard>(cards: T[], archivedBeatIds?: ReadonlySet<string>): T[] {
  return cards.filter((c) => !isSetAside(c, archivedBeatIds));
}

// Placeholders still to be filled in: gap scenes and gap beats that are on the
// board (not set aside or archived).
export function openGaps<
  C extends { id: string; title: string; gap?: boolean | null; parked?: boolean | null; beatId?: string | null },
  B extends { id: string; title: string; gap?: boolean | null; archived?: boolean | null },
>(cards: C[], beats: B[]): { kind: "scene" | "beat"; id: string; title: string; beatId: string | null }[] {
  const archived = new Set(beats.filter((b) => b.archived).map((b) => b.id));
  return [
    ...beats.filter((b) => b.gap && !b.archived).map((b) => ({ kind: "beat" as const, id: b.id, title: b.title, beatId: b.id })),
    ...cards
      .filter((c) => c.gap && !c.parked && !(c.beatId && archived.has(c.beatId)))
      .map((c) => ({ kind: "scene" as const, id: c.id, title: c.title, beatId: c.beatId ?? null })),
  ];
}
