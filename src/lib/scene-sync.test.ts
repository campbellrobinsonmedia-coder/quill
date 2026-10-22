import { describe, expect, it } from "vitest";
import {
  findOrphanedCards,
  findUnlinkedScenes,
  isScriptInOrder,
  moveScene,
  reorderLinkedScenes,
  sceneIdsInOrder,
  sortCardsByScriptOrder,
} from "@/lib/scene-sync";
import type { ScreenplayElement } from "@/lib/draft-content";

const h = (id: string, text = id): ScreenplayElement => ({ id, type: "scene_heading", text });
const a = (id: string): ScreenplayElement => ({ id, type: "action", text: id });

const script: ScreenplayElement[] = [
  a("intro"),
  h("s1"),
  a("s1-a"),
  h("s2"),
  a("s2-a"),
  a("s2-b"),
  h("s3"),
  a("s3-a"),
  h("s4"),
];

const ids = (els: ScreenplayElement[]) => els.map((e) => e.id);

describe("reorderLinkedScenes", () => {
  it("re-sequences named scenes with their bodies, keeping the preamble", () => {
    const out = reorderLinkedScenes(script, ["s3", "s2", "s1", "s4"]);
    expect(ids(out)).toEqual(["intro", "s3", "s3-a", "s2", "s2-a", "s2-b", "s1", "s1-a", "s4"]);
  });

  it("leaves scenes without a card where they are", () => {
    // s2 has no card: only s1, s3, s4 are reordered, into their own slots.
    const out = reorderLinkedScenes(script, ["s4", "s3", "s1"]);
    expect(sceneIdsInOrder(out)).toEqual(["s4", "s2", "s3", "s1"]);
    expect(ids(out)).toContain("s2-b");
  });

  it("ignores ids that aren't in the script and never drops an element", () => {
    const out = reorderLinkedScenes(script, ["gone", "s2", "s1"]);
    expect(ids(out).sort()).toEqual(ids(script).sort());
    expect(sceneIdsInOrder(out).slice(0, 2)).toEqual(["s2", "s1"]);
  });

  it("is a no-op when already in order", () => {
    expect(ids(reorderLinkedScenes(script, ["s1", "s2", "s3", "s4"]))).toEqual(ids(script));
  });
});

describe("moveScene", () => {
  it("moves a scene down past its neighbour", () => {
    expect(sceneIdsInOrder(moveScene(script, "s1", 1))).toEqual(["s2", "s1", "s3", "s4"]);
  });

  it("moves up, and stops at the ends and at the preamble", () => {
    expect(sceneIdsInOrder(moveScene(script, "s3", -1))).toEqual(["s1", "s3", "s2", "s4"]);
    expect(moveScene(script, "s1", -1)).toBe(script);
    expect(moveScene(script, "s4", 1)).toBe(script);
  });
});

describe("isScriptInOrder", () => {
  it("compares the relative order of linked scenes only", () => {
    expect(isScriptInOrder(script, ["s1", "s3"])).toBe(true);
    expect(isScriptInOrder(script, ["s3", "s1"])).toBe(false);
    expect(isScriptInOrder(script, ["missing", "s2"])).toBe(true);
  });
});

describe("unlinked scenes and orphaned cards", () => {
  it("finds scenes with no card", () => {
    expect(findUnlinkedScenes(script, ["s1", null, "s3"]).map((s) => s.id)).toEqual(["s2", "s4"]);
  });

  it("finds cards whose scene was deleted", () => {
    const cards = [
      { id: "c1", linkedSceneId: "s1" },
      { id: "c2", linkedSceneId: "deleted" },
      { id: "c3", linkedSceneId: null },
    ];
    expect(findOrphanedCards(cards, script).map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("sortCardsByScriptOrder", () => {
  it("orders linked cards by script position and leaves unlinked ones in place", () => {
    const cards = [
      { id: "cA", linkedSceneId: "s3" },
      { id: "free", linkedSceneId: null },
      { id: "cB", linkedSceneId: "s1" },
    ];
    const out = sortCardsByScriptOrder(cards, ["s1", "s2", "s3", "s4"]);
    expect(out.map((c) => c.id)).toEqual(["cB", "free", "cA"]);
  });
});
