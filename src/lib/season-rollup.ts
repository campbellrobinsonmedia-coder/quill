import {
  estimatePageCount,
  estimateScenePages,
  type DraftContent,
} from "@/lib/draft-content";
import { buildProgress, pageTargetFor, type CardStatus } from "@/lib/plan-progress";

// The season page's view of how far each episode has got, built from the same
// numbers as an episode's Plan page, plus how the season arc is covered.

export type EpisodeRollup = {
  total: number;
  counts: Record<CardStatus, number>;
  scriptPages: number | null;
  target: number | null;
};

export function episodeRollup(episode: {
  formatTemplate: string;
  pageTarget: number | null;
  cards: { id: string; status: string; linkedSceneId: string | null; beatId: string | null }[];
  draftContent: DraftContent | null;
}): EpisodeRollup {
  const screenplay = episode.draftContent?.type === "screenplay" ? episode.draftContent : null;
  const progress = buildProgress({
    cards: episode.cards,
    scenes: screenplay ? estimateScenePages(screenplay.elements) : null,
    beats: [],
    scriptPages: screenplay ? estimatePageCount(screenplay) : null,
    target: screenplay ? pageTargetFor(episode.formatTemplate, episode.pageTarget) : null,
  });
  return {
    total: progress.total,
    counts: progress.counts,
    scriptPages: progress.scriptPages,
    target: progress.target,
  };
}

export type SeasonTotals = {
  episodes: number;
  scenes: number;
  written: number;
  started: number;
  idea: number;
  pages: number;
  /** Sum of the episodes' page targets (episodes without one add nothing). */
  target: number;
};

export function seasonTotals(rollups: EpisodeRollup[]): SeasonTotals {
  const totals: SeasonTotals = {
    episodes: rollups.length,
    scenes: 0,
    written: 0,
    started: 0,
    idea: 0,
    pages: 0,
    target: 0,
  };
  for (const r of rollups) {
    totals.scenes += r.total;
    totals.written += r.counts.written;
    totals.started += r.counts.started;
    totals.idea += r.counts.idea;
    totals.pages += r.scriptPages ?? 0;
    totals.target += r.target ?? 0;
  }
  totals.pages = Math.round(totals.pages * 10) / 10;
  return totals;
}

export type ArcTone = "muted" | "amber" | "blue" | "emerald";
export type ArcCoverage = { label: string; tone: ArcTone };

// Where a season arc beat stands, judged by the episode it's assigned to.
export function arcCoverage(
  beat: { projectId: string | null },
  rollups: Map<string, EpisodeRollup>
): ArcCoverage {
  if (!beat.projectId) return { label: "Not assigned to an episode", tone: "amber" };
  const r = rollups.get(beat.projectId);
  if (!r || r.total === 0) return { label: "Episode not planned yet", tone: "muted" };
  if (r.counts.written === r.total) return { label: `Written · ${r.total} scenes`, tone: "emerald" };
  if (r.counts.written > 0 || r.counts.started > 0) {
    return { label: `In progress · ${r.counts.written}/${r.total} written`, tone: "blue" };
  }
  return { label: `Planned · ${r.total} scene${r.total === 1 ? "" : "s"}`, tone: "blue" };
}

// What the arc is missing: beats nobody owns, and episodes with no part of the
// arc to carry.
export function arcGaps(
  beats: { title: string; projectId: string | null }[],
  episodes: { id: string; episodeNumber: number | null }[]
): { unassigned: string[]; episodesWithoutBeats: number[] } {
  const assigned = new Set(beats.map((b) => b.projectId).filter(Boolean));
  return {
    unassigned: beats.filter((b) => !b.projectId).map((b) => b.title),
    episodesWithoutBeats:
      beats.length === 0
        ? []
        : episodes
            .filter((e) => !assigned.has(e.id) && e.episodeNumber !== null)
            .map((e) => e.episodeNumber as number),
  };
}
