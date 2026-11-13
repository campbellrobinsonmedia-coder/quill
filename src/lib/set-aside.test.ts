import { describe, expect, it } from "vitest";
import { isSetAside, withoutSetAside } from "@/lib/set-aside";
import { buildLayout, cardNumbers } from "@/lib/plan-layout";
import { buildOutlineExport } from "@/lib/outline-export";
import { episodeRollup } from "@/lib/season-rollup";

const c = (id: string, order: number, beatId: string | null, extra = {}) => ({
  id,
  title: `Scene ${id}`,
  summary: null,
  turn: null,
  colorTag: null,
  location: null,
  storyThread: null,
  linkedSceneId: null,
  status: "idea",
  beatId,
  order,
  characters: [],
  ...extra,
});

describe("set aside", () => {
  it("counts a parked scene, or a scene in an archived beat", () => {
    const archived = new Set(["b2"]);
    expect(isSetAside({ parked: true, beatId: null }, archived)).toBe(true);
    expect(isSetAside({ parked: false, beatId: "b2" }, archived)).toBe(true);
    expect(isSetAside({ parked: false, beatId: "b1" }, archived)).toBe(false);
    expect(isSetAside({ parked: false, beatId: null })).toBe(false);
    expect(withoutSetAside([{ parked: true }, { parked: false }])).toHaveLength(1);
  });

  it("numbers the remaining scenes without gaps", () => {
    const layout = buildLayout([], [c("a", 0, null), c("b", 1, null), c("c", 2, null)]);
    const numbers = cardNumbers(layout, new Set(["b"]));
    expect(numbers.get("a")).toBe(1);
    expect(numbers.has("b")).toBe(false);
    expect(numbers.get("c")).toBe(2);
  });

  it("leaves set-aside scenes and archived beats out of the printouts", () => {
    const data = buildOutlineExport({
      title: "T",
      logline: null,
      author: null,
      format: "Feature",
      beats: [
        { id: "b1", title: "Setup", summary: null, order: 0 },
        { id: "b2", title: "Old idea", summary: null, order: 1, archived: true },
      ],
      cards: [c("a", 0, "b1"), c("b", 1, "b1", { parked: true }), c("c", 2, "b2"), c("d", 3, "b1")],
      sceneLabels: {},
    });
    expect(data.cards.map((x) => x.title)).toEqual(["Scene a", "Scene d"]);
    expect(data.cards.map((x) => x.number)).toEqual([1, 2]);
    expect(data.groups.map((g) => g.label)).toEqual(["Setup"]);
  });

  it("doesn't count them in an episode's progress", () => {
    const base = { formatTemplate: "tv-pilot-hour", pageTarget: null, draftContent: null };
    const cards = [c("a", 0, "b1"), c("b", 1, "b1", { parked: true }), c("c", 2, "b2")];
    expect(episodeRollup({ ...base, cards }).total).toBe(2);
    expect(episodeRollup({ ...base, cards, archivedBeatIds: new Set(["b2"]) }).total).toBe(1);
  });
});
