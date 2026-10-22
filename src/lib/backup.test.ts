import { describe, expect, it } from "vitest";
import { countBackup, parseBackup } from "@/lib/backup";

const backup = {
  app: "Quill",
  formatVersion: 1,
  exportedAt: "2026-10-22T10:00:00.000Z",
  user: { email: "x@y.z" },
  ideas: [{ id: "i1", content: "spark" }],
  projects: [
    {
      id: "p1",
      title: "Script",
      characters: [{ id: "c1", name: "Mara", references: [{ id: "r1", characterId: "c1" }] }],
      outlineCards: [{ id: "k1", title: "Scene", characters: [{ id: "c1" }] }],
      worldNotes: [{ id: "n1", title: "Attic", references: [] }],
      // An episode's beats include season beats assigned to it.
      beats: [{ id: "b1", title: "Beat", references: [{ id: "r2", beatId: "b1" }] }],
      draft: {
        id: "d1",
        content: { type: "screenplay", elements: [] },
        versions: [{ id: "v1" }, { id: "v2" }],
        comments: [{ id: "m1" }],
      },
    },
    { id: "p2", title: "Prose", draft: null },
  ],
  series: [
    {
      id: "s1",
      title: "Show",
      seasons: [
        {
          id: "se1",
          beats: [{ id: "b1", title: "Beat" }, { id: "b2", title: "Season beat" }],
          references: [{ id: "r3", seasonId: "se1" }],
        },
      ],
      characters: [{ id: "c2", name: "Eli", references: [] }],
      worldNotes: [],
      beats: [],
      references: [{ id: "r4", seriesId: "s1" }],
    },
  ],
};

describe("parseBackup", () => {
  it("flattens everything and dedupes records listed twice", () => {
    const flat = parseBackup(JSON.stringify(backup));
    expect(countBackup(flat)).toEqual({
      series: 1,
      season: 1,
      project: 2,
      idea: 1,
      character: 2,
      card: 1,
      note: 1,
      beat: 2, // b1 appears under both the season and the episode
      reference: 4,
      draft: 1,
      version: 2,
      comment: 1,
    });
    expect(flat.exportedAt).toBe("2026-10-22T10:00:00.000Z");
  });

  it("strips nested children from the flattened records", () => {
    const flat = parseBackup(JSON.stringify(backup));
    expect("references" in flat.character[0]).toBe(false);
    expect("draft" in flat.project[0]).toBe(false);
    expect("versions" in flat.draft[0]).toBe(false);
  });

  it("rejects files that aren't Quill backups", () => {
    expect(() => parseBackup("not json")).toThrow(/valid JSON/);
    expect(() => parseBackup(JSON.stringify({ app: "Other" }))).toThrow(/Quill backup/);
    expect(() => parseBackup(JSON.stringify([]))).toThrow(/Quill backup/);
  });

  it("accepts an empty backup", () => {
    const flat = parseBackup(JSON.stringify({ app: "Quill" }));
    expect(Object.values(countBackup(flat)).every((n) => n === 0)).toBe(true);
  });
});
