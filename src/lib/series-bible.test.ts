import { describe, expect, it } from "vitest";
import { buildSeriesBible } from "@/lib/series-bible";
import { renderSeriesBiblePdf } from "@/lib/series-bible-pdf";

function toBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
const pages = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

const input = (over = {}) => ({
  title: "Lighthouse Chronicles",
  format: "serialized",
  premise: "A keeper hears ships that never arrive.",
  beats: [{ title: "Premise", summary: "x" }],
  characters: [{ name: "Mara", description: "The keeper.", arcNotes: "Hope → doubt", relationships: null }],
  worldNotes: [
    { title: "The bell", category: "Lore", description: "Rings at night." },
    { title: "Dock", category: null, description: null },
    { title: "Tide tables", category: "Lore", description: null },
  ],
  seasons: [
    {
      number: 2,
      title: null,
      beats: [],
      episodes: [{ episodeNumber: 1, title: "Pilot", episodeTitle: "Low Water", logline: "A ship appears." }],
    },
    { number: 1, title: "The Bell", beats: [{ title: "Hook", summary: null }], episodes: [] },
  ],
  ...over,
});

describe("buildSeriesBible", () => {
  const bible = buildSeriesBible(input());

  it("cleans text for the PDF fonts", () => {
    expect(bible.characters[0].arcNotes).toBe("Hope -> doubt");
  });
  it("groups world notes by category in the order they appear", () => {
    expect(bible.world.map((g) => [g.category, g.notes.map((n) => n.title)])).toEqual([
      ["Lore", ["The bell", "Tide tables"]],
      ["Notes", ["Dock"]],
    ]);
  });
  it("orders seasons and prefers the episode title", () => {
    expect(bible.seasons.map((s) => s.label)).toEqual(["Season 1: The Bell", "Season 2"]);
    expect(bible.seasons[1].episodes[0].title).toBe("Low Water");
  });
});

describe("renderSeriesBiblePdf", () => {
  it("makes a one-page document for a small series", async () => {
    expect(pages(await toBuffer(renderSeriesBiblePdf(buildSeriesBible(input()))))).toBe(1);
  });

  it("makes a document even when the series is empty", async () => {
    const empty = buildSeriesBible(
      input({ format: null, premise: null, beats: [], characters: [], worldNotes: [], seasons: [] })
    );
    const pdf = await toBuffer(renderSeriesBiblePdf(empty));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("flows a large series onto more pages", async () => {
    const characters = Array.from({ length: 60 }, (_, i) => ({
      name: `Character ${i}`,
      description: "A person with a long history. ".repeat(20),
      arcNotes: "They change. ".repeat(10),
      relationships: "Knows everyone. ".repeat(5),
    }));
    expect(pages(await toBuffer(renderSeriesBiblePdf(buildSeriesBible(input({ characters })))))).toBeGreaterThan(3);
  });
});
