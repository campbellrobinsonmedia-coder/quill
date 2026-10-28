import { describe, expect, it } from "vitest";
import { buildCharacterMatrix, buildThreadMatrix, presenceFlags, type MatrixEpisode } from "@/lib/season-matrix";

const ep = (n: number, cards: MatrixEpisode["cards"]): MatrixEpisode => ({ id: `e${n}`, number: n, cards });
const card = (title: string, storyThread: string | null, chars: string[] = []) => ({
  title,
  storyThread,
  characters: chars.map((c) => ({ id: c.toLowerCase(), name: c })),
});

describe("presenceFlags", () => {
  const nums = [1, 2, 3, 4, 5, 6];

  it("is quiet when a row appears steadily", () => {
    expect(presenceFlags([true, true, false, true, true, true], nums)).toEqual([]);
  });
  it("flags two or more missed episodes in a row between appearances", () => {
    expect(presenceFlags([true, false, false, true, true, true], nums)).toEqual(["Missing from episodes 2 and 3"]);
    expect(presenceFlags([true, false, false, false, true, true], nums)).toEqual(["Missing from episodes 2, 3 and 4"]);
  });
  it("flags a row that drops out for the rest of the season", () => {
    expect(presenceFlags([true, true, true, false, false, false], nums)).toEqual(["Not seen since episode 3"]);
  });
  it("doesn't flag a single trailing miss", () => {
    expect(presenceFlags([true, true, true, true, true, false], nums)).toEqual([]);
  });
  it("flags a row that shows up once in a season of three or more", () => {
    expect(presenceFlags([false, false, true, false, false, false], nums)).toEqual([
      "Only in episode 3",
      "Not seen since episode 3",
    ]);
    expect(presenceFlags([true, false], [1, 2])).toEqual([]);
  });
  it("ignores a row that never appears", () => {
    expect(presenceFlags([false, false, false], [1, 2, 3])).toEqual([]);
  });
});

describe("thread matrix", () => {
  const episodes = [
    ep(1, [card("Bell", "A"), card("Secret", "b")]),
    ep(2, [card("Log", "a")]),
    ep(3, [card("Storm", "A")]),
    ep(4, [card("Fog", "A"), card("Untagged", null)]),
  ];
  const rows = buildThreadMatrix(episodes);

  it("groups case-insensitively and sorts by name", () => {
    expect(rows.map((r) => [r.label, r.total])).toEqual([["A", 4], ["B", 1]]);
    expect(rows[0].cells).toEqual([["Bell"], ["Log"], ["Storm"], ["Fog"]]);
  });
  it("flags the storyline that went quiet", () => {
    expect(rows[0].flags).toEqual([]);
    expect(rows[1].flags).toEqual(["Only in episode 1", "Not seen since episode 1"]);
  });
});

describe("character matrix", () => {
  const episodes = [
    ep(1, [card("a", null, ["Mara", "Eli"]), card("b", null, ["Mara"])]),
    ep(2, [card("c", null, ["Mara"])]),
    ep(3, [card("d", null, ["Mara"])]),
    ep(4, [card("e", null, ["Mara", "Nils"])]),
  ];
  const rows = buildCharacterMatrix(episodes);

  it("puts the busiest characters first", () => {
    expect(rows.map((r) => [r.label, r.total])).toEqual([["Mara", 5], ["Eli", 1], ["Nils", 1]]);
  });
  it("flags the character who vanished and the one who only just arrived", () => {
    expect(rows[1].flags).toEqual(["Only in episode 1", "Not seen since episode 1"]);
    expect(rows[2].flags).toEqual(["Only in episode 4"]);
  });
});
