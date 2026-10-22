import { describe, expect, it } from "vitest";
import {
  formatCastStats,
  formatLocationStats,
  missingFromSaved,
  normalizeCueName,
  titleCaseName,
} from "@/lib/cast";
import { buildCharacterReport, buildSceneReport } from "@/lib/screenplay-analysis";
import type { ScreenplayContent } from "@/lib/draft-content";

describe("normalizeCueName", () => {
  it("strips extensions and uppercases", () => {
    expect(normalizeCueName("Mara (V.O.)")).toBe("MARA");
    expect(normalizeCueName("MARA (CONT'D)")).toBe("MARA");
    expect(normalizeCueName("  dr.  smith  (O.S.) (on phone) ")).toBe("DR. SMITH");
    expect(normalizeCueName("(O.S.)")).toBe("");
  });
});

describe("titleCaseName", () => {
  it("title-cases cue names", () => {
    expect(titleCaseName("MARA")).toBe("Mara");
    expect(titleCaseName("DR. SMITH")).toBe("Dr. Smith");
    expect(titleCaseName("O'BRIEN")).toBe("O'Brien");
    expect(titleCaseName("MARY-JANE")).toBe("Mary-Jane");
  });
});

describe("missingFromSaved", () => {
  it("returns script names with no saved match, ignoring case and extensions", () => {
    const rows = [{ name: "MARA" }, { name: "ELI" }, { name: "MARA (V.O.)" }];
    expect(missingFromSaved(rows, ["Mara"]).map((r) => r.name)).toEqual(["ELI"]);
  });
});

describe("report integration", () => {
  const script: ScreenplayContent = {
    type: "screenplay",
    elements: [
      { id: "h1", type: "scene_heading", text: "INT. LAB - DAY" },
      { id: "c1", type: "character", text: "ELI" },
      { id: "d1", type: "dialogue", text: "It works." },
      { id: "h2", type: "scene_heading", text: "EXT. ROOF - NIGHT" },
      { id: "c2", type: "character", text: "ELI (V.O.)" },
      { id: "d2", type: "dialogue", text: "I knew it would." },
      { id: "c3", type: "character", text: "MARA" },
      { id: "d3", type: "dialogue", text: "Sure." },
    ],
  };

  it("counts an extension as the same character and records the first scene", () => {
    const rows = buildCharacterReport(script, buildSceneReport(script));
    const eli = rows.find((r) => r.name === "ELI")!;
    expect(rows.filter((r) => r.name.startsWith("ELI"))).toHaveLength(1);
    expect(eli).toMatchObject({ sceneCount: 2, lineCount: 2, firstScene: "1" });
    expect(rows.find((r) => r.name === "MARA")!.firstScene).toBe("2");
  });
});

describe("stat formatting", () => {
  it("formats character and location stats", () => {
    expect(formatCastStats({ sceneCount: 1, lineCount: 3, dialogueWordCount: 40, firstScene: "2" })).toBe(
      "1 scene · 3 lines · 40 words · first in scene 2"
    );
    expect(
      formatLocationStats({ sceneCount: 3, intCount: 2, extCount: 1, dayCount: 0, nightCount: 3 })
    ).toBe("3 scenes · 2 INT · 1 EXT · 3 night");
  });
});
