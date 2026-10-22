import { describe, expect, it } from "vitest";
import { buildProgress, defaultPageTarget, effectiveStatus, pageTargetFor } from "@/lib/plan-progress";
import { estimateScenePages, estimateScreenplayPageCount, type ScreenplayElement } from "@/lib/draft-content";

const el = (id: string, type: ScreenplayElement["type"], text: string): ScreenplayElement => ({ id, type, text });

describe("page targets", () => {
  it("defaults by format and lets the writer override", () => {
    expect(defaultPageTarget("feature-screenplay")).toBe(110);
    expect(defaultPageTarget("tv-pilot-hour")).toBe(55);
    expect(defaultPageTarget("tv-pilot-half-hour")).toBe(30);
    expect(defaultPageTarget("custom-screenplay")).toBeNull();
    expect(pageTargetFor("feature-screenplay", 90)).toBe(90);
    expect(pageTargetFor("feature-screenplay", null)).toBe(110);
    expect(pageTargetFor("short-story", null)).toBeNull();
  });
});

describe("scene pages", () => {
  const elements = [
    el("h1", "scene_heading", "INT. LAMP ROOM - NIGHT"),
    el("a1", "action", "Mara winds the clock."),
    el("c1", "character", "MARA"),
    el("d1", "dialogue", "Who's out there?"),
    el("h2", "scene_heading", "EXT. DOCK - DAY"),
    el("h3", "scene_heading", "INT. KITCHEN - DAY"),
    el("a3", "action", "  "),
  ];

  it("adds up to the whole-script estimate", () => {
    const scenes = estimateScenePages(elements);
    const total = Array.from(scenes.values()).reduce((n, s) => n + s.pages, 0);
    expect(Math.round(total * 10) / 10).toBe(
      estimateScreenplayPageCount({ type: "screenplay", elements })
    );
  });

  it("knows which scenes have text", () => {
    const scenes = estimateScenePages(elements);
    expect(scenes.get("h1")?.hasContent).toBe(true);
    expect(scenes.get("h2")?.hasContent).toBe(false);
    expect(scenes.get("h3")?.hasContent).toBe(false); // whitespace only
  });
});

describe("status", () => {
  it("lifts to started once the linked scene has text, never down", () => {
    expect(effectiveStatus("idea", { pages: 1, hasContent: true })).toBe("started");
    expect(effectiveStatus("idea", { pages: 0.1, hasContent: false })).toBe("idea");
    expect(effectiveStatus("written", { pages: 0.1, hasContent: false })).toBe("written");
    expect(effectiveStatus("junk", undefined)).toBe("idea");
  });
});

describe("buildProgress", () => {
  const scenes = new Map([
    ["s1", { pages: 2.04, hasContent: true }],
    ["s2", { pages: 1, hasContent: false }],
  ]);
  const cards = [
    { id: "a", status: "written", linkedSceneId: "s1", beatId: "b1" },
    { id: "b", status: "idea", linkedSceneId: "s2", beatId: "b1" },
    { id: "c", status: "idea", linkedSceneId: null, beatId: "b2" },
    { id: "d", status: "idea", linkedSceneId: "gone", beatId: null },
  ];
  const progress = buildProgress({
    cards,
    scenes,
    beats: [
      { id: "b1", title: "Setup" },
      { id: "b2", title: "Midpoint" },
      { id: "b3", title: "Empty" },
    ],
    scriptPages: 33,
    target: 110,
  });

  it("counts statuses and per-card pages", () => {
    expect(progress.total).toBe(4);
    expect(progress.counts).toEqual({ idea: 3, started: 0, written: 1 });
    expect(progress.cardStats.a).toEqual({ status: "written", pages: 2 });
    expect(progress.cardStats.b).toEqual({ status: "idea", pages: 1 });
    expect(progress.cardStats.c.pages).toBeNull();
    expect(progress.cardStats.d.pages).toBeNull(); // scene was removed
  });

  it("reports pages against the target", () => {
    expect(progress.percentOfTarget).toBe(30);
    expect(buildProgress({ cards: [], scenes: null, beats: [], scriptPages: 10, target: null }).percentOfTarget).toBeNull();
  });

  it("groups by beat in story order, skipping empty beats", () => {
    expect(progress.beats.map((b) => [b.label, b.total])).toEqual([
      ["Unplanned", 1],
      ["Setup", 2],
      ["Midpoint", 1],
    ]);
    expect(progress.beats[1]).toMatchObject({ pages: 3, counts: { written: 1, idea: 1, started: 0 } });
  });
});
