import { describe, expect, it } from "vitest";
import { toFDX, fromFDX } from "@/lib/fdx";
import { toFountain } from "@/lib/fountain";
import type { ScreenplayContent } from "@/lib/draft-content";

const script: ScreenplayContent = {
  type: "screenplay",
  elements: [
    { id: "1", type: "scene_heading", text: "INT. LIGHTHOUSE - NIGHT" },
    { id: "2", type: "action", text: "Rain & wind < hammer > the \"glass\"." },
    { id: "3", type: "character", text: "MARA" },
    { id: "4", type: "parenthetical", text: "(quietly)" },
    { id: "5", type: "dialogue", text: "Nobody's out here." },
    { id: "6", type: "transition", text: "CUT TO:" },
  ],
};

describe("FDX round trip", () => {
  it("preserves element types and escaped text", () => {
    const back = fromFDX(toFDX(script, "The Last Lighthouse"));
    expect(back.elements.map((e) => e.type)).toEqual(script.elements.map((e) => e.type));
    expect(back.elements.map((e) => e.text)).toEqual(script.elements.map((e) => e.text));
  });

  it("skips omitted scenes on export", () => {
    const withOmitted: ScreenplayContent = {
      type: "screenplay",
      elements: [{ id: "1", type: "scene_heading", text: "INT. GONE - DAY", omitted: true }, ...script.elements],
    };
    expect(fromFDX(toFDX(withOmitted, "T")).elements[0].text).toBe("INT. LIGHTHOUSE - NIGHT");
  });

  it("returns a single empty heading for an empty document", () => {
    const back = fromFDX('<?xml version="1.0"?><FinalDraft><Content></Content></FinalDraft>');
    expect(back.elements).toHaveLength(1);
    expect(back.elements[0].type).toBe("scene_heading");
  });
});

describe("Fountain export", () => {
  it("forces character cues and transitions and carries the title", () => {
    const out = toFountain(script, { title: "The Last Lighthouse", author: "Cam" });
    expect(out).toContain("Title: The Last Lighthouse");
    expect(out).toContain("@MARA");
    expect(out).toContain("> CUT TO:");
    expect(out).toContain("INT. LIGHTHOUSE - NIGHT");
  });

  it("appends scene numbers only when locked", () => {
    const numbered: ScreenplayContent = {
      type: "screenplay",
      elements: [{ id: "1", type: "scene_heading", text: "INT. A - DAY", sceneNumber: "12" }],
    };
    expect(toFountain(numbered, { title: "T", sceneNumbersLocked: true })).toContain("INT. A - DAY #12#");
    expect(toFountain(numbered, { title: "T", sceneNumbersLocked: false })).not.toContain("#12#");
  });
});
