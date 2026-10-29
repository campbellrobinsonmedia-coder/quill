import { nameKey } from "@/lib/cast";

// Moving a scene card to another episode of the same series. What the card
// keeps and what it can't take with it.

export type MovingCharacter = { id: string; name: string; seriesId: string | null };

// Series characters work in every episode, so they stay. An episode's own
// characters are matched by name to the target episode's; anyone who has no
// counterpart there is left off the card (and named, so the writer knows).
export function carryOverCharacters(
  characters: MovingCharacter[],
  targetOwn: { id: string; name: string }[]
): { keep: string[]; dropped: string[] } {
  const targetByName = new Map(targetOwn.map((c) => [nameKey(c.name), c.id]));
  const keep: string[] = [];
  const dropped: string[] = [];
  for (const c of characters) {
    if (c.seriesId) {
      keep.push(c.id);
      continue;
    }
    const match = targetByName.get(nameKey(c.name));
    if (match) keep.push(match);
    else dropped.push(c.name);
  }
  return { keep: Array.from(new Set(keep)), dropped };
}

export type EpisodeTarget = { id: string; label: string };

// "S2 E3: The Lamp Room" for the Move menu; the current episode is left out.
export function episodeTargets(
  episodes: {
    id: string;
    episodeNumber: number | null;
    episodeTitle: string | null;
    title: string;
    season: { number: number } | null;
  }[],
  currentId: string
): EpisodeTarget[] {
  return episodes
    .filter((e) => e.id !== currentId)
    .sort(
      (a, b) =>
        (a.season?.number ?? 0) - (b.season?.number ?? 0) ||
        (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
    )
    .map((e) => ({
      id: e.id,
      label: `S${e.season?.number ?? "?"} E${e.episodeNumber ?? "?"}: ${e.episodeTitle || e.title}`,
    }));
}
