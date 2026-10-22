// "Highlight" on the Plan views: pick a character, storyline or location and
// every other card dims.

export type CardFilter =
  | { kind: "character"; value: string } // character id
  | { kind: "thread"; value: string } // storyline label
  | { kind: "location"; value: string }; // location, case-insensitive

type FilterableCard = {
  storyThread: string | null;
  location: string | null;
  characters: { id: string }[];
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function matchesFilter(card: FilterableCard, filter: CardFilter | null): boolean {
  if (!filter) return true;
  switch (filter.kind) {
    case "character":
      return card.characters.some((c) => c.id === filter.value);
    case "thread":
      return norm(card.storyThread) === norm(filter.value);
    case "location":
      return norm(card.location) === norm(filter.value);
  }
}

export type FilterOptions = {
  characters: { id: string; name: string }[];
  threads: string[];
  locations: string[];
};

// What's worth highlighting: only the characters, storylines and locations
// that actually appear on cards.
export function filterOptions(
  cards: (FilterableCard & { characters: { id: string; name: string }[] })[]
): FilterOptions {
  const characters = new Map<string, string>();
  const threads = new Set<string>();
  const locations = new Map<string, string>();
  for (const card of cards) {
    for (const c of card.characters) characters.set(c.id, c.name);
    const thread = card.storyThread?.trim();
    if (thread) threads.add(thread);
    const loc = card.location?.trim();
    if (loc && !locations.has(norm(loc))) locations.set(norm(loc), loc);
  }
  return {
    characters: Array.from(characters, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
    threads: Array.from(threads).sort((a, b) => a.localeCompare(b)),
    locations: Array.from(locations.values()).sort((a, b) => a.localeCompare(b)),
  };
}

// Encodes a filter for a <select> value, e.g. "character:abc123".
export function encodeFilter(filter: CardFilter | null): string {
  return filter ? `${filter.kind}:${filter.value}` : "";
}

export function decodeFilter(value: string): CardFilter | null {
  const i = value.indexOf(":");
  if (i < 0) return null;
  const kind = value.slice(0, i);
  const rest = value.slice(i + 1);
  if (!rest) return null;
  return kind === "character" || kind === "thread" || kind === "location"
    ? ({ kind, value: rest } as CardFilter)
    : null;
}
