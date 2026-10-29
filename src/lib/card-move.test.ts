import { describe, expect, it } from "vitest";
import { carryOverCharacters, episodeTargets } from "@/lib/card-move";

describe("carryOverCharacters", () => {
  it("keeps series characters as they are", () => {
    const r = carryOverCharacters([{ id: "s1", name: "Mara", seriesId: "ser" }], []);
    expect(r).toEqual({ keep: ["s1"], dropped: [] });
  });

  it("swaps an episode's own character for the same-named one in the target", () => {
    const r = carryOverCharacters(
      [{ id: "a", name: "Dr. Voss (V.O.)", seriesId: null }],
      [{ id: "b", name: "DR. VOSS" }]
    );
    expect(r).toEqual({ keep: ["b"], dropped: [] });
  });

  it("names the characters it can't carry over", () => {
    const r = carryOverCharacters(
      [
        { id: "a", name: "Keeper", seriesId: null },
        { id: "s", name: "Mara", seriesId: "ser" },
      ],
      [{ id: "z", name: "Someone else" }]
    );
    expect(r).toEqual({ keep: ["s"], dropped: ["Keeper"] });
  });

  it("doesn't list a character twice", () => {
    const r = carryOverCharacters(
      [
        { id: "a", name: "Eli", seriesId: null },
        { id: "a2", name: "ELI", seriesId: null },
      ],
      [{ id: "b", name: "Eli" }]
    );
    expect(r.keep).toEqual(["b"]);
  });
});

describe("episodeTargets", () => {
  const ep = (id: string, season: number | null, n: number | null, title = "T") => ({
    id,
    episodeNumber: n,
    episodeTitle: null,
    title,
    season: season === null ? null : { number: season },
  });

  it("leaves out the current episode and orders by season then episode", () => {
    const r = episodeTargets([ep("c", 2, 1), ep("a", 1, 2), ep("b", 1, 1), ep("me", 1, 3)], "me");
    expect(r.map((t) => t.id)).toEqual(["b", "a", "c"]);
    expect(r[0].label).toBe("S1 E1: T");
  });

  it("prefers the episode title", () => {
    const r = episodeTargets([{ ...ep("x", 1, 1), episodeTitle: "Pilot" }], "other");
    expect(r[0].label).toBe("S1 E1: Pilot");
  });
});
