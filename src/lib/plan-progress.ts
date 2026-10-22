import type { ScenePages } from "@/lib/draft-content";

// Progress on the Plan page, read from the script: how many scene cards are
// written, how many pages that is, and where in the story the work is.

export const CARD_STATUSES = ["idea", "started", "written"] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const STATUS_LABELS: Record<CardStatus, string> = {
  idea: "Idea",
  started: "Started",
  written: "Written",
};

export function isCardStatus(value: unknown): value is CardStatus {
  return typeof value === "string" && (CARD_STATUSES as readonly string[]).includes(value);
}

// Page goal when the writer hasn't set one: the usual length of the format.
export function defaultPageTarget(formatTemplate: string): number | null {
  switch (formatTemplate) {
    case "feature-screenplay":
      return 110;
    case "tv-pilot-hour":
      return 55;
    case "tv-pilot-half-hour":
      return 30;
    default:
      return null;
  }
}

export function pageTargetFor(formatTemplate: string, override: number | null): number | null {
  return override && override > 0 ? override : defaultPageTarget(formatTemplate);
}

const RANK: Record<CardStatus, number> = { idea: 0, started: 1, written: 2 };

// What the writer marked, lifted to "started" when the linked scene already has
// text in the script. Only the writer can call a scene "written".
export function effectiveStatus(stored: string, scene: ScenePages | undefined): CardStatus {
  const base: CardStatus = isCardStatus(stored) ? stored : "idea";
  return scene?.hasContent && RANK[base] < RANK.started ? "started" : base;
}

export type CardStat = { status: CardStatus; pages: number | null };

type ProgressCard = {
  id: string;
  status: string;
  linkedSceneId: string | null;
  beatId: string | null;
};

export type BeatProgress = {
  key: string;
  label: string;
  total: number;
  counts: Record<CardStatus, number>;
  pages: number;
};

export type PlanProgress = {
  total: number;
  counts: Record<CardStatus, number>;
  /** Estimated pages of the whole script, or null for prose. */
  scriptPages: number | null;
  target: number | null;
  /** Pages as a share of the target, 0–100+; null with no target. */
  percentOfTarget: number | null;
  beats: BeatProgress[];
  cardStats: Record<string, CardStat>;
};

const emptyCounts = (): Record<CardStatus, number> => ({ idea: 0, started: 0, written: 0 });
const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildProgress({
  cards,
  scenes,
  beats,
  scriptPages,
  target,
}: {
  cards: ProgressCard[];
  /** Scene pages by scene heading id; null when there's no screenplay. */
  scenes: Map<string, ScenePages> | null;
  /** Project beats in story order. */
  beats: { id: string; title: string }[];
  scriptPages: number | null;
  target: number | null;
}): PlanProgress {
  const counts = emptyCounts();
  const cardStats: Record<string, CardStat> = {};
  const segments = new Map<string, BeatProgress>();
  const segment = (key: string, label: string) => {
    let s = segments.get(key);
    if (!s) {
      s = { key, label, total: 0, counts: emptyCounts(), pages: 0 };
      segments.set(key, s);
    }
    return s;
  };

  segment("unplanned", beats.length > 0 ? "Unplanned" : "Scenes");
  for (const b of beats) segment(b.id, b.title);

  for (const card of cards) {
    const scene = card.linkedSceneId ? scenes?.get(card.linkedSceneId) : undefined;
    const status = effectiveStatus(card.status, scene);
    const pages = scene ? round1(scene.pages) : null;
    cardStats[card.id] = { status, pages };
    counts[status] += 1;

    const seg = segments.get(card.beatId ?? "unplanned") ?? segment("unplanned", "Unplanned");
    seg.total += 1;
    seg.counts[status] += 1;
    seg.pages += scene?.pages ?? 0;
  }

  const roundedBeats = Array.from(segments.values())
    .filter((s) => s.total > 0)
    .map((s) => ({ ...s, pages: round1(s.pages) }));

  return {
    total: cards.length,
    counts,
    scriptPages,
    target,
    percentOfTarget:
      target && scriptPages !== null ? Math.round((scriptPages / target) * 100) : null,
    beats: roundedBeats,
    cardStats,
  };
}
