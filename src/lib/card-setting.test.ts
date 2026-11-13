import { describe, expect, it } from "vitest";
import { intExtPrefix, normalizeIntExt, normalizeTime } from "@/lib/card-setting";
import { cardHeading } from "@/lib/card-face";
import { decodeFilter, encodeFilter, filterOptions, matchesFilter } from "@/lib/card-filter";

describe("card setting", () => {
  it("normalises INT./EXT. however it's written", () => {
    expect(normalizeIntExt("int.")).toBe("INT");
    expect(normalizeIntExt("EXT")).toBe("EXT");
    expect(normalizeIntExt("INT./EXT.")).toBe("INT/EXT");
    expect(normalizeIntExt("I/E")).toBe("INT/EXT");
    expect(normalizeIntExt("nonsense")).toBeNull();
    expect(normalizeIntExt("")).toBeNull();
    expect(intExtPrefix("INT/EXT")).toBe("INT./EXT.");
  });

  it("tidies the time of day", () => {
    expect(normalizeTime("  late   night ")).toBe("LATE NIGHT");
    expect(normalizeTime("   ")).toBeNull();
    expect(normalizeTime("x".repeat(50))).toHaveLength(30);
  });

  it("builds a card heading from whatever is planned", () => {
    expect(cardHeading({ location: "Lamp room" })).toBe("LAMP ROOM");
    expect(cardHeading({ location: "Lamp room", intExt: "INT", timeOfDay: "night" })).toBe("INT. LAMP ROOM - NIGHT");
    expect(cardHeading({ intExt: "EXT", timeOfDay: "dawn" })).toBe("EXT. \u00b7 DAWN");
    expect(cardHeading({ sceneLabel: "3. INT. ATTIC - DAY", location: "Elsewhere", timeOfDay: "night" })).toBe("INT. ATTIC - DAY");
    expect(cardHeading({})).toBeNull();
  });

  it("highlights and lists settings and times", () => {
    const cards = [
      { storyThread: null, location: null, characters: [], intExt: "INT", timeOfDay: "Night" },
      { storyThread: null, location: null, characters: [], intExt: "EXT", timeOfDay: "NIGHT" },
      { storyThread: null, location: null, characters: [], intExt: null, timeOfDay: "day" },
    ];
    const options = filterOptions(cards);
    expect(options.settings).toEqual(["INT", "EXT"]);
    expect(options.times).toEqual(["DAY", "NIGHT"]);
    expect(cards.filter((c) => matchesFilter(c, { kind: "time", value: "NIGHT" }))).toHaveLength(2);
    expect(cards.filter((c) => matchesFilter(c, { kind: "setting", value: "EXT" }))).toHaveLength(1);
    expect(decodeFilter(encodeFilter({ kind: "setting", value: "INT/EXT" }))).toEqual({ kind: "setting", value: "INT/EXT" });
  });
});
