import { describe, expect, it } from "vitest";
import {
  buildCharacterReport,
  buildLocationReport,
  buildSceneReport,
} from "@/lib/screenplay-analysis";
import type { ScreenplayContent, ScreenplayElement } from "@/lib/draft-content";

const script: ScreenplayContent = {
  type: "screenplay",
  elements: [
    { id: "h1", type: "scene_heading", text: "INT. LIGHTHOUSE - NIGHT" },
    { id: "a1", type: "action", text: "Rain hammers the glass." },
    { id: "c1", type: "character", text: "MARA" },
    { id: "d1", type: "dialogue", text: "Nobody is out here but us." },
    { id: "h2", type: "scene_heading", text: "EXT. CLIFFSIDE - DAWN" },
    { id: "c2", type: "character", text: "MARA" },
    { id: "d2", type: "dialogue", text: "Still here." },
  ] satisfies ScreenplayElement[],
};

describe("buildSceneReport", () => {
  it("numbers scenes 1, 2 for an unlocked draft (not 0A)", () => {
    const rows = buildSceneReport(script);
    expect(rows.map((r) => r.number)).toEqual(["1", "2"]);
  });

  it("uses locked numbers when the draft is locked", () => {
    const locked: ScreenplayContent = {
      type: "screenplay",
      elements: script.elements.map((el) =>
        el.id === "h1" ? { ...el, sceneNumber: "10" } : el.id === "h2" ? { ...el, sceneNumber: "11" } : el
      ),
    };
    expect(buildSceneReport(locked, true).map((r) => r.number)).toEqual(["10", "11"]);
  });
});

describe("location and character reports", () => {
  it("counts scenes, INT/EXT and day/night per location", () => {
    const rows = buildLocationReport(buildSceneReport(script));
    const lighthouse = rows.find((r) => r.location === "LIGHTHOUSE");
    expect(lighthouse).toMatchObject({ sceneCount: 1, intCount: 1, extCount: 0, nightCount: 1 });
    const cliff = rows.find((r) => r.location === "CLIFFSIDE");
    expect(cliff).toMatchObject({ sceneCount: 1, extCount: 1, dayCount: 1 });
  });

  it("counts a character's scenes, lines and dialogue words", () => {
    const rows = buildCharacterReport(script, buildSceneReport(script));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "MARA", sceneCount: 2, lineCount: 2 });
    expect(rows[0].dialogueWordCount).toBe(8);
  });

  it("does not credit stray dialogue after an action line to the last speaker", () => {
    const stray: ScreenplayContent = {
      type: "screenplay",
      elements: [
        { id: "h", type: "scene_heading", text: "INT. A - DAY" },
        { id: "c", type: "character", text: "MARA" },
        { id: "d", type: "dialogue", text: "Hello there." },
        { id: "a", type: "action", text: "She leaves." },
        { id: "x", type: "dialogue", text: "Orphan line." },
      ],
    };
    const rows = buildCharacterReport(stray, buildSceneReport(stray));
    expect(rows[0]).toMatchObject({ name: "MARA", lineCount: 1, dialogueWordCount: 2 });
  });
});
