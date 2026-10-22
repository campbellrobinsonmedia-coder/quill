import { describe, expect, it } from "vitest";
import {
  buildLayout,
  cardNumbers,
  columnOf,
  flattenLayout,
  moveBeat,
  moveCard,
  serializeLayout,
  UNPLANNED,
} from "@/lib/plan-layout";

const beats = [
  { id: "b2", order: 1 },
  { id: "b1", order: 0 },
];
const cards = [
  { id: "c1", beatId: "b1", order: 0 },
  { id: "c2", beatId: null, order: 1 },
  { id: "c3", beatId: "b2", order: 2 },
  { id: "c4", beatId: "b1", order: 3 },
  { id: "orphan", beatId: "deleted-beat", order: 4 },
];

describe("buildLayout", () => {
  it("orders beats, groups cards under them, and puts the rest in unplanned", () => {
    const layout = buildLayout(beats, cards);
    expect(layout.beatIds).toEqual(["b1", "b2"]);
    expect(layout.columns.b1).toEqual(["c1", "c4"]);
    expect(layout.columns.b2).toEqual(["c3"]);
    expect(layout.columns[UNPLANNED]).toEqual(["c2", "orphan"]);
  });

  it("works with no beats at all", () => {
    const layout = buildLayout([], cards);
    expect(layout.beatIds).toEqual([]);
    expect(layout.columns[UNPLANNED]).toHaveLength(5);
  });
});

describe("moveCard", () => {
  const layout = buildLayout(beats, cards);

  it("moves a card to another column at an index", () => {
    const next = moveCard(layout, "c2", "b1", 1);
    expect(next.columns.b1).toEqual(["c1", "c2", "c4"]);
    expect(columnOf(next, "c2")).toBe("b1");
    expect(next.columns[UNPLANNED]).toEqual(["orphan"]);
  });

  it("reorders within a column", () => {
    const next = moveCard(layout, "c4", "b1", 0);
    expect(next.columns.b1).toEqual(["c4", "c1"]);
  });

  it("appends when no index is given and never loses or duplicates a card", () => {
    const next = moveCard(layout, "c1", "b2");
    expect(next.columns.b2).toEqual(["c3", "c1"]);
    expect(flattenLayout(next).sort()).toEqual(flattenLayout(layout).sort());
  });

  it("ignores unknown columns and cards", () => {
    expect(moveCard(layout, "c1", "nope")).toBe(layout);
    expect(moveCard(layout, "ghost", "b1")).toBe(layout);
  });

  it("does not mutate the input", () => {
    const before = JSON.stringify(layout);
    moveCard(layout, "c1", "b2", 0);
    expect(JSON.stringify(layout)).toBe(before);
  });
});

describe("moveBeat", () => {
  it("reorders beats and keeps their scenes", () => {
    const layout = buildLayout(beats, cards);
    const next = moveBeat(layout, "b2", 0);
    expect(next.beatIds).toEqual(["b2", "b1"]);
    expect(next.columns.b1).toEqual(["c1", "c4"]);
  });
});

describe("story order", () => {
  it("flattens unplanned first, then beat by beat", () => {
    const layout = buildLayout(beats, cards);
    expect(flattenLayout(layout)).toEqual(["c2", "orphan", "c1", "c4", "c3"]);
    expect(cardNumbers(layout).get("c3")).toBe(5);
  });

  it("serializes with unplanned first as a null beat", () => {
    const out = serializeLayout(buildLayout(beats, cards));
    expect(out.columns[0]).toEqual({ beatId: null, cardIds: ["c2", "orphan"] });
    expect(out.columns[1]).toEqual({ beatId: "b1", cardIds: ["c1", "c4"] });
    expect(out.beatIds).toEqual(["b1", "b2"]);
  });
});
