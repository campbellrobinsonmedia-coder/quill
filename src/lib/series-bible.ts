import { pdfSafe } from "@/lib/outline-export";

// The series as data for the printable bible / pitch document.

export type SeriesBible = {
  title: string;
  format: string;
  premise: string;
  arc: { title: string; summary: string }[];
  characters: { name: string; description: string; arcNotes: string; relationships: string }[];
  /** World notes grouped by category, in the order the categories first appear. */
  world: { category: string; notes: { title: string; description: string }[] }[];
  seasons: {
    label: string;
    arc: { title: string; summary: string }[];
    episodes: { number: number | null; title: string; logline: string }[];
  }[];
};

const UNCATEGORISED = "Notes";

export function buildSeriesBible(input: {
  title: string;
  format: string | null;
  premise: string | null;
  beats: { title: string; summary: string | null }[];
  characters: {
    name: string;
    description: string | null;
    arcNotes: string | null;
    relationships: string | null;
  }[];
  worldNotes: { title: string; category: string | null; description: string | null }[];
  seasons: {
    number: number;
    title: string | null;
    beats: { title: string; summary: string | null }[];
    episodes: {
      episodeNumber: number | null;
      title: string;
      episodeTitle: string | null;
      logline: string | null;
    }[];
  }[];
}): SeriesBible {
  const beat = (b: { title: string; summary: string | null }) => ({
    title: pdfSafe(b.title) || "Untitled",
    summary: pdfSafe(b.summary, { keepNewlines: true }),
  });

  const categories = new Map<string, { title: string; description: string }[]>();
  for (const n of input.worldNotes) {
    const category = pdfSafe(n.category) || UNCATEGORISED;
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category)!.push({
      title: pdfSafe(n.title) || "Untitled",
      description: pdfSafe(n.description, { keepNewlines: true }),
    });
  }

  return {
    title: pdfSafe(input.title) || "Untitled",
    format: pdfSafe(input.format),
    premise: pdfSafe(input.premise, { keepNewlines: true }),
    arc: input.beats.map(beat),
    characters: input.characters.map((c) => ({
      name: pdfSafe(c.name) || "Unnamed",
      description: pdfSafe(c.description, { keepNewlines: true }),
      arcNotes: pdfSafe(c.arcNotes, { keepNewlines: true }),
      relationships: pdfSafe(c.relationships, { keepNewlines: true }),
    })),
    world: Array.from(categories, ([category, notes]) => ({ category, notes })),
    seasons: [...input.seasons]
      .sort((a, b) => a.number - b.number)
      .map((s) => ({
        label: `Season ${s.number}${pdfSafe(s.title) ? `: ${pdfSafe(s.title)}` : ""}`,
        arc: s.beats.map(beat),
        episodes: s.episodes.map((e) => ({
          number: e.episodeNumber,
          title: pdfSafe(e.episodeTitle || e.title) || "Untitled",
          logline: pdfSafe(e.logline),
        })),
      })),
  };
}
