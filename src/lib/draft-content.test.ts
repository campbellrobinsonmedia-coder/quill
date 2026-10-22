import { describe, expect, it } from "vitest";
import {
  computeSceneNumbers,
  countWords,
  detectElementType,
  enterOnEmptyType,
  nextEnterType,
  nextTabType,
  prevTabType,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/draft-content";

const el = (
  id: string,
  type: ScreenplayElementType,
  text: string,
  extra: Partial<ScreenplayElement> = {}
): ScreenplayElement => ({ id, type, text, ...extra });

describe("nextEnterType", () => {
  it("follows standard screenplay flow", () => {
    expect(nextEnterType("scene_heading")).toBe("action");
    expect(nextEnterType("action")).toBe("action");
    expect(nextEnterType("character")).toBe("dialogue");
    expect(nextEnterType("parenthetical")).toBe("dialogue");
    expect(nextEnterType("dialogue")).toBe("character");
    expect(nextEnterType("transition")).toBe("scene_heading");
  });
});

describe("enterOnEmptyType", () => {
  it("converts empty cue-like lines to action in place", () => {
    for (const t of ["character", "parenthetical", "dialogue", "transition", "scene_heading"] as const) {
      expect(enterOnEmptyType(t)).toBe("action");
    }
  });

  it("leaves an empty action line alone", () => {
    expect(enterOnEmptyType("action")).toBeNull();
  });
});

describe("detectElementType", () => {
  it("turns INT./EXT. action lines into scene headings", () => {
    expect(detectElementType("action", "INT. KITCHEN - DAY")).toBe("scene_heading");
    expect(detectElementType("action", "ext. cliffside - dawn")).toBe("scene_heading");
    expect(detectElementType("action", "EXT. ")).toBe("scene_heading");
    expect(detectElementType("action", "INT./EXT. CAR - NIGHT")).toBe("scene_heading");
    expect(detectElementType("action", "I/E. TRAIN")).toBe("scene_heading");
    expect(detectElementType("action", "EST. LONDON")).toBe("scene_heading");
  });

  it("does not fire on ordinary prose that merely starts with those letters", () => {
    expect(detectElementType("action", "Extra people cross the street.")).toBeNull();
    expect(detectElementType("action", "International flights land.")).toBeNull();
    expect(detectElementType("action", "INT")).toBeNull();
    expect(detectElementType("action", "EXT.")).toBeNull();
  });

  it("detects all-caps transitions only", () => {
    expect(detectElementType("action", "CUT TO:")).toBe("transition");
    expect(detectElementType("action", "SMASH CUT TO:")).toBe("transition");
    expect(detectElementType("action", "FADE OUT.")).toBe("transition");
    expect(detectElementType("action", "She wants to cut to:")).toBeNull();
    expect(detectElementType("action", "cut to:")).toBeNull();
  });

  it("only applies to action lines", () => {
    expect(detectElementType("dialogue", "INT. KITCHEN - DAY")).toBeNull();
    expect(detectElementType("character", "CUT TO:")).toBeNull();
    expect(detectElementType("scene_heading", "INT. KITCHEN - DAY")).toBeNull();
  });
});

describe("tab cycle", () => {
  it("round-trips forward then backward", () => {
    for (const t of ["scene_heading", "action", "character", "parenthetical", "dialogue", "transition"] as const) {
      expect(prevTabType(nextTabType(t))).toBe(t);
    }
  });
});

describe("computeSceneNumbers", () => {
  const headings = [
    el("a", "scene_heading", "INT. A - DAY"),
    el("x", "action", "stuff"),
    el("b", "scene_heading", "INT. B - DAY"),
  ];

  it("auto-numbers from 1 when unlocked", () => {
    const n = computeSceneNumbers(headings, false);
    expect(n.get("a")).toBe("1");
    expect(n.get("b")).toBe("2");
  });

  it("keeps persisted numbers when locked and suffixes inserted scenes", () => {
    const locked = [
      el("a", "scene_heading", "INT. A", { sceneNumber: "1" }),
      el("new", "scene_heading", "INT. NEW"),
      el("new2", "scene_heading", "INT. NEW2"),
      el("b", "scene_heading", "INT. B", { sceneNumber: "2" }),
    ];
    const n = computeSceneNumbers(locked, true);
    expect(n.get("a")).toBe("1");
    expect(n.get("new")).toBe("1A");
    expect(n.get("new2")).toBe("1B");
    expect(n.get("b")).toBe("2");
  });
});

describe("countWords", () => {
  it("counts prose and screenplay text", () => {
    expect(countWords({ type: "prose", text: "  one two\nthree  " })).toBe(3);
    expect(countWords({ type: "prose", text: "" })).toBe(0);
    expect(
      countWords({
        type: "screenplay",
        elements: [el("a", "action", "one two"), el("b", "dialogue", "three")],
      })
    ).toBe(3);
  });
});
