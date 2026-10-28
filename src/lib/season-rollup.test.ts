import { describe, expect, it } from "vitest";
import { arcCoverage, arcGaps, episodeRollup, seasonTotals, type EpisodeRollup } from "@/lib/season-rollup";
import type { ScreenplayElement } from "@/lib/draft-content";

const roll = (total: number, written: number, started: number, pages: number | null, target: number | null): EpisodeRollup => ({
  total,
  counts: { written, started, idea: total - written - started },
  scriptPages: pages,
  target,
});

describe("episodeRollup", () => {
  const elements: ScreenplayElement[] = [
    { id: "s1", type: "scene_heading", text: "INT. LAMP ROOM - NIGHT" },
    { id: "a1", type: "action", text: "Mara winds the clock." },
  ];
  const cards = [
    { id: "a", status: "written", linkedSceneId: null, beatId: null },
    { id: "b", status: "idea", linkedSceneId: "s1", beatId: null },
    { id: "c", status: "idea", linkedSceneId: null, beatId: null },
  ];

  it("counts statuses (a scene with text is started) and pages against the format's target", () => {
    const r = episodeRollup({
      formatTemplate: "tv-pilot-hour",
      pageTarget: null,
      cards,
      draftContent: { type: "screenplay", elements },
    });
    expect(r.total).toBe(3);
    expect(r.counts).toEqual({ idea: 1, started: 1, written: 1 });
    expect(r.target).toBe(55);
    expect(r.scriptPages).toBeGreaterThan(0);
  });

  it("has no pages or target without a script", () => {
    const r = episodeRollup({ formatTemplate: "tv-pilot-hour", pageTarget: 40, cards, draftContent: null });
    expect(r.scriptPages).toBeNull();
    expect(r.target).toBeNull();
  });
});

describe("seasonTotals", () => {
  it("adds the episodes up", () => {
    expect(seasonTotals([roll(10, 4, 2, 30.04, 55), roll(0, 0, 0, null, null), roll(5, 0, 1, 12.3, 55)])).toEqual({
      episodes: 3,
      scenes: 15,
      written: 4,
      started: 3,
      idea: 8,
      pages: 42.3,
      target: 110,
    });
  });
});

describe("arc coverage", () => {
  const rollups = new Map([
    ["e1", roll(0, 0, 0, 0, 55)],
    ["e2", roll(6, 0, 0, 0, 55)],
    ["e3", roll(6, 2, 1, 10, 55)],
    ["e4", roll(6, 6, 0, 50, 55)],
  ]);

  it("describes each beat by its episode", () => {
    expect(arcCoverage({ projectId: null }, rollups)).toEqual({ label: "Not assigned to an episode", tone: "amber" });
    expect(arcCoverage({ projectId: "e1" }, rollups).label).toBe("Episode not planned yet");
    expect(arcCoverage({ projectId: "missing" }, rollups).label).toBe("Episode not planned yet");
    expect(arcCoverage({ projectId: "e2" }, rollups).label).toBe("Planned · 6 scenes");
    expect(arcCoverage({ projectId: "e3" }, rollups).label).toBe("In progress · 2/6 written");
    expect(arcCoverage({ projectId: "e4" }, rollups)).toEqual({ label: "Written · 6 scenes", tone: "emerald" });
  });

  it("finds beats nobody owns and episodes with no beats", () => {
    const eps = [
      { id: "e1", episodeNumber: 1 },
      { id: "e2", episodeNumber: 2 },
      { id: "e3", episodeNumber: 3 },
    ];
    expect(
      arcGaps(
        [
          { title: "Midpoint", projectId: "e2" },
          { title: "Finale", projectId: null },
        ],
        eps
      )
    ).toEqual({ unassigned: ["Finale"], episodesWithoutBeats: [1, 3] });
  });

  it("reports no gaps when the season has no arc beats yet", () => {
    expect(arcGaps([], [{ id: "e1", episodeNumber: 1 }])).toEqual({ unassigned: [], episodesWithoutBeats: [] });
  });
});
