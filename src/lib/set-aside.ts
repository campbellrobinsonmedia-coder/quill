// Scenes and beats can be put aside without deleting them: a scene "set aside"
// stays on the board greyed out, and an archived beat leaves the board with its
// scenes. Neither counts towards progress, numbering or printouts.

type AsideCard = { parked?: boolean | null; beatId?: string | null };

export function isSetAside(card: AsideCard, archivedBeatIds?: ReadonlySet<string>): boolean {
  return !!card.parked || (!!card.beatId && !!archivedBeatIds?.has(card.beatId));
}

export function withoutSetAside<T extends AsideCard>(cards: T[], archivedBeatIds?: ReadonlySet<string>): T[] {
  return cards.filter((c) => !isSetAside(c, archivedBeatIds));
}
