import { describe, expect, it } from "vitest";
import { cardHeading, headingForCard, initials, sceneHeadingFromLabel, splitCharacters } from "@/lib/card-face";

describe("sceneHeadingFromLabel", () => {
  it("strips the scene number", () => {
    expect(sceneHeadingFromLabel("3. INT. ATTIC - DAY")).toBe("INT. ATTIC - DAY");
    expect(sceneHeadingFromLabel("24A. EXT. CLIFF - DAWN")).toBe("EXT. CLIFF - DAWN");
  });

  it("handles missing or empty labels", () => {
    expect(sceneHeadingFromLabel(undefined)).toBeNull();
    expect(sceneHeadingFromLabel("")).toBeNull();
    expect(sceneHeadingFromLabel("1. ")).toBeNull();
  });
});

describe("initials", () => {
  it("takes up to two initials", () => {
    expect(initials("Mara Voss")).toBe("MV");
    expect(initials("Eli")).toBe("E");
    expect(initials("dr. smith")).toBe("DS");
    expect(initials("Mary Jane Watson")).toBe("MJ");
  });

  it("falls back for empty names", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("splitCharacters", () => {
  it("shows a few and counts the rest", () => {
    expect(splitCharacters([1, 2, 3, 4, 5], 3)).toEqual({ shown: [1, 2, 3], extra: 2 });
    expect(splitCharacters([1], 3)).toEqual({ shown: [1], extra: 0 });
  });
});

describe("cardHeading", () => {
  it("prefers the linked scene's heading, then the location", () => {
    expect(cardHeading({ sceneLabel: "2. INT. LAB - DAY", location: "attic" })).toBe("INT. LAB - DAY");
    expect(cardHeading({ location: "attic" })).toBe("ATTIC");
    expect(cardHeading({})).toBeNull();
  });
});

describe("headingForCard", () => {
  it("turns a location into a heading to edit", () => {
    expect(headingForCard("Lamp room")).toBe("INT. LAMP ROOM - DAY");
  });
  it("keeps a heading the writer already typed", () => {
    expect(headingForCard("ext. dock - night")).toBe("EXT. DOCK - NIGHT");
  });
  it("leaves an empty prefix to fill in when there's no location", () => {
    expect(headingForCard(null)).toBe("INT. ");
    expect(headingForCard("  ")).toBe("INT. ");
  });
});
