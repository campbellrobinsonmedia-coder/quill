import { cardHeading } from "@/lib/card-face";
import { swatchFor } from "@/lib/outline-colors";
import { buildLayout, cardNumbers, UNPLANNED } from "@/lib/plan-layout";

// The Plan board as plain data for the printable PDFs (index cards, outline).

// The PDF's built-in fonts only cover Western European text. Swap the
// symbols the app itself uses for plain ones and drop what can't be printed,
// rather than let it come out as garbage.
const PRINTABLE = /[^\n -~ -ÿ‘’“”–—…•€]/g;

export function pdfSafe(text: string | null | undefined, opts: { keepNewlines?: boolean } = {}): string {
  const swapped = (text ?? "").replace(/\r\n?/g, "\n").replace(/→/g, "->").replace(/←/g, "<-").replace(/↳/g, ">");
  const cleaned = swapped.replace(PRINTABLE, "");
  return (
    opts.keepNewlines
      ? cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
      : cleaned.replace(/\s+/g, " ")
  ).trim();
}

export type ExportCard = {
  number: number;
  /** The beat it sits under, when the script uses beats. */
  beat: string | null;
  /** Scene heading, from the linked scene or the card's location. */
  heading: string | null;
  title: string;
  summary: string;
  turn: string;
  characters: string[];
  storyThread: string;
  location: string;
  color: string;
};

export type OutlineExport = {
  title: string;
  logline: string;
  author: string;
  format: string;
  /** Every card in story order. */
  cards: ExportCard[];
  /** The same cards grouped under their beats (unplanned first). */
  groups: { key: string; label: string; summary: string; cards: ExportCard[] }[];
};

type SourceCard = {
  id: string;
  title: string;
  summary: string | null;
  turn: string | null;
  colorTag: string | null;
  location: string | null;
  storyThread: string | null;
  linkedSceneId: string | null;
  beatId: string | null;
  order: number;
  characters: { name: string }[];
};

export function buildOutlineExport(input: {
  title: string;
  logline: string | null;
  author: string | null;
  format: string;
  beats: { id: string; title: string; summary: string | null; order: number }[];
  cards: SourceCard[];
  /** scene heading id -> label like "3. INT. ATTIC - DAY" */
  sceneLabels: Record<string, string>;
}): OutlineExport {
  const layout = buildLayout(input.beats, input.cards);
  const numbers = cardNumbers(layout);
  const beatsById = new Map(input.beats.map((b) => [b.id, b]));
  const cardsById = new Map(input.cards.map((c) => [c.id, c]));
  const hasBeats = layout.beatIds.length > 0;

  const toExport = (id: string, beatLabel: string | null): ExportCard => {
    const c = cardsById.get(id)!;
    const sceneLabel = c.linkedSceneId ? input.sceneLabels[c.linkedSceneId] : undefined;
    return {
      number: numbers.get(id) ?? 0,
      beat: beatLabel,
      heading: pdfSafe(cardHeading({ sceneLabel, location: c.location })) || null,
      title: pdfSafe(c.title) || "Untitled",
      summary: pdfSafe(c.summary, { keepNewlines: true }),
      turn: pdfSafe(c.turn),
      characters: c.characters.map((ch) => pdfSafe(ch.name)).filter(Boolean),
      storyThread: pdfSafe(c.storyThread),
      location: pdfSafe(c.location),
      color: swatchFor(c.colorTag),
    };
  };

  const groups = [
    {
      key: UNPLANNED,
      label: hasBeats ? "Unplanned" : "Scenes",
      summary: "",
      ids: layout.columns[UNPLANNED],
    },
    ...layout.beatIds.map((id) => ({
      key: id,
      label: pdfSafe(beatsById.get(id)?.title) || "Beat",
      summary: pdfSafe(beatsById.get(id)?.summary),
      ids: layout.columns[id] ?? [],
    })),
  ]
    .filter((g) => g.ids.length > 0 || g.key !== UNPLANNED)
    .map((g) => ({
      key: g.key,
      label: g.label,
      summary: g.summary,
      cards: g.ids.map((id) => toExport(id, hasBeats ? g.label : null)),
    }));

  return {
    title: pdfSafe(input.title) || "Untitled",
    logline: pdfSafe(input.logline),
    author: pdfSafe(input.author),
    format: pdfSafe(input.format),
    cards: groups.flatMap((g) => g.cards),
    groups,
  };
}
