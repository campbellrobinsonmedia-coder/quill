import { describe, expect, it } from "vitest";
import {
  decodeFilter,
  encodeFilter,
  filterOptions,
  matchesFilter,
} from "@/lib/card-filter";
import { beatSpans, buildCharacterLanes, buildThreadLanes, NO_THREAD } from "@/lib/plan-lanes";
import { buildLayout, flattenLayout, moveCardOnto } from "@/lib/plan-layout";

const mara = { id: "c1", name: "Mara" };
const eli = { id: "c2", name: "Eli" };
const cards = [
  { id: "k1", storyThread: "A", location: "Lamp room", characters: [mara] },
  { id: "k2", storyThread: "b", location: "lamp room ", characters: [mara, eli] },
  { id: "k3", storyThread: null, location: "Dock", characters: [eli] },
  { id: "k4", storyThread: "A", location: null, characters: [] },
];

describe("matchesFilter", () => {
  it("matches everything with no filter", () => {
    expect(cards.every((c) => matchesFilter(c, null))).toBe(true);
  });

  it("matches by character, storyline and location, ignoring case and spacing", () => {
    expect(cards.filter((c) => matchesFilter(c, { kind: "character", value: "c2" })).map((c) => c.id)).toEqual(["k2", "k3"]);
    expect(cards.filter((c) => matchesFilter(c, { kind: "thread", value: "a" })).map((c) => c.id)).toEqual(["k1", "k4"]);
    expect(cards.filter((c) => matchesFilter(c, { kind: "location", value: "LAMP ROOM" })).map((c) => c.id)).toEqual(["k1", "k2"]);
  });
});

describe("filterOptions", () => {
  it("lists only what appears on cards, deduped", () => {
    const o = filterOptions(cards);
    expect(o.characters.map((c) => c.name)).toEqual(["Eli", "Mara"]);
    expect(o.threads).toEqual(["A", "b"]);
    expect(o.locations).toEqual(["Dock", "Lamp room"]);
  });
});

describe("filter encoding", () => {
  it("round-trips through a select value", () => {
    const f = { kind: "location", value: "Lamp room: upper" } as const;
    expect(decodeFilter(encodeFilter(f))).toEqual(f);
    expect(decodeFilter(encodeFilter(null))).toBeNull();
    expect(decodeFilter("bogus:x")).toBeNull();
  });
});

describe("lanes", () => {
  it("makes a row per storyline with a cell per scene in order", () => {
    const lanes = buildThreadLanes(cards);
    expect(lanes.map((l) => l.key)).toEqual(["A", "B", NO_THREAD]);
    const a = lanes[0];
    expect(a.cells.map((c) => c?.id ?? null)).toEqual(["k1", null, null, "k4"]);
    // every scene lands in exactly one storyline row
    for (let i = 0; i < cards.length; i++) {
      expect(lanes.filter((l) => l.cells[i]).length).toBe(1);
    }
  });

  it("makes a row per character, busiest first, a scene in several rows if several characters are in it", () => {
    const lanes = buildCharacterLanes(cards);
    expect(lanes.map((l) => l.label)).toEqual(["Eli", "Mara"]);
    expect(lanes[0].cells.map((c) => c?.id ?? null)).toEqual([null, "k2", "k3", null]);
    expect(lanes[1].cells.map((c) => c?.id ?? null)).toEqual(["k1", "k2", null, null]);
  });
});

describe("beat spans and wall reordering", () => {
  const layout = buildLayout(
    [{ id: "b1", order: 0 }, { id: "b2", order: 1 }],
    [
      { id: "k1", beatId: "b1", order: 0 },
      { id: "k2", beatId: "b1", order: 1 },
      { id: "k3", beatId: "b2", order: 2 },
      { id: "k4", beatId: null, order: 3 },
    ]
  );

  it("describes the header strip, skipping empty beats", () => {
    const spans = beatSpans(buildLayout([{ id: "b1", order: 0 }, { id: "b2", order: 1 }, { id: "b3", order: 2 }], [
      { id: "k1", beatId: "b1", order: 0 },
      { id: "k2", beatId: "b2", order: 1 },
    ]), (id) => `beat ${id}`);
    expect(spans.map((s) => `${s.label}:${s.count}`)).toEqual(["beat b1:1", "beat b2:1"]);
  });

  it("moves a card within its beat like a normal list reorder", () => {
    expect(flattenLayout(moveCardOnto(layout, "k2", "k1"))).toEqual(["k4", "k2", "k1", "k3"]);
    expect(flattenLayout(moveCardOnto(layout, "k1", "k2"))).toEqual(["k4", "k2", "k1", "k3"]);
  });

  it("makes a card join the beat of the card it's dropped on", () => {
    const next = moveCardOnto(layout, "k4", "k3");
    expect(next.columns.b2).toEqual(["k4", "k3"]);
    expect(next.columns.unplanned).toEqual([]);
  });

  it("ignores dropping a card on itself", () => {
    expect(moveCardOnto(layout, "k1", "k1")).toBe(layout);
  });
});
