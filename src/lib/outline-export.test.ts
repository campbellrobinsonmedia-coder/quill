import { describe, expect, it } from "vitest";
import { buildOutlineExport, buildSeasonExport, pdfSafe } from "@/lib/outline-export";
import {
  renderIndexCardsPdf,
  renderOutlinePdf,
  renderSeasonCardsPdf,
  renderSeasonOutlinePdf,
} from "@/lib/outline-pdf";

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

const card = (id: string, order: number, beatId: string | null, extra = {}) => ({
  id,
  title: `Scene ${id}`,
  summary: "Something happens that matters a great deal to everyone involved.",
  turn: "hope -> doubt",
  colorTag: "blue",
  location: "Lamp room",
  storyThread: "A",
  linkedSceneId: null,
  beatId,
  order,
  characters: [{ name: "Mara" }, { name: "Eli" }],
  ...extra,
});

const input = (cards: ReturnType<typeof card>[]) => ({
  title: "Lighthouse",
  logline: "A keeper hears ships that never arrive.",
  author: "C. Robinson",
  format: "Feature Screenplay",
  beats: [
    { id: "b1", title: "Setup", summary: "Meet the keeper.", order: 0 },
    { id: "b2", title: "Midpoint", summary: null, order: 1 },
  ],
  cards,
  sceneLabels: { s1: "2. INT. LAMP ROOM - NIGHT" },
});

describe("pdfSafe", () => {
  it("swaps the app's arrows and drops what the PDF fonts can't print", () => {
    expect(pdfSafe("hope → doubt")).toBe("hope -> doubt");
    expect(pdfSafe("Ship ⚓ ahoy")).toBe("Ship ahoy");
    expect(pdfSafe("Café — “quoted”")).toBe("Café — “quoted”");
  });
  it("collapses lines unless asked to keep them", () => {
    expect(pdfSafe("a\n\nb")).toBe("a b");
    expect(pdfSafe("a\n\n\n\nb", { keepNewlines: true })).toBe("a\n\nb");
    expect(pdfSafe(null)).toBe("");
  });
});

describe("buildOutlineExport", () => {
  const data = buildOutlineExport(
    input([
      card("a", 0, "b2"),
      card("loose", 1, null, { linkedSceneId: "s1" }),
      card("b", 2, "b1"),
      card("empty", 3, "b1", { title: "  ", summary: null, turn: null, location: null }),
    ])
  );

  it("numbers scenes in story order, unplanned first, like the Plan board", () => {
    expect(data.cards.map((c) => [c.number, c.title])).toEqual([
      [1, "Scene loose"],
      [2, "Scene b"],
      [3, "Untitled"],
      [4, "Scene a"],
    ]);
  });

  it("groups under beats", () => {
    expect(data.groups.map((g) => [g.label, g.cards.length])).toEqual([
      ["Unplanned", 1],
      ["Setup", 2],
      ["Midpoint", 1],
    ]);
  });

  it("uses the linked scene's heading, else the location", () => {
    expect(data.cards[0].heading).toBe("INT. LAMP ROOM - NIGHT");
    expect(data.cards[1].heading).toBe("LAMP ROOM");
    expect(data.cards[2].heading).toBeNull();
  });
});

describe("PDFs", () => {
  const many = (n: number) =>
    buildOutlineExport(input(Array.from({ length: n }, (_, i) => card(String(i), i, i % 2 ? "b1" : "b2"))));

  it("lays index cards four to a sheet", async () => {
    expect(pages(await toBuffer(renderIndexCardsPdf(many(1))))).toBe(1);
    expect(pages(await toBuffer(renderIndexCardsPdf(many(4))))).toBe(1);
    expect(pages(await toBuffer(renderIndexCardsPdf(many(5))))).toBe(2);
    expect(pages(await toBuffer(renderIndexCardsPdf(many(9))))).toBe(3);
  });

  it("still makes a PDF with no cards", async () => {
    const empty = buildOutlineExport(input([]));
    const cards = await toBuffer(renderIndexCardsPdf(empty));
    const outline = await toBuffer(renderOutlinePdf(empty));
    expect(cards.subarray(0, 4).toString()).toBe("%PDF");
    expect(outline.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("fits a typical outline on one page and flows a huge one onto more", async () => {
    expect(pages(await toBuffer(renderOutlinePdf(many(20))))).toBe(1);
    expect(pages(await toBuffer(renderOutlinePdf(many(400))))).toBeGreaterThan(1);
  });

  it("survives text far too long for a card", async () => {
    const long = "word ".repeat(2000);
    const data = buildOutlineExport(input([card("x", 0, "b1", { summary: long, turn: long, title: long })]));
    expect(pages(await toBuffer(renderIndexCardsPdf(data)))).toBe(1);
  });
});

describe("season prints", () => {
  const episode = (number: number, cardCount: number) => ({
    number,
    title: `Episode ${number} title`,
    logline: null,
    format: "TV Hour",
    beats: [{ id: `b${number}`, title: "Setup", summary: null, order: 0 }],
    cards: Array.from({ length: cardCount }, (_, i) => card(`${number}-${i}`, i, `b${number}`)),
    sceneLabels: {},
  });
  const season = (counts: number[]) =>
    buildSeasonExport({
      seriesTitle: "Lighthouse Chronicles",
      seasonLabel: "Season 1",
      episodes: counts.map((n, i) => episode(i + 1, n)),
    });

  it("tags each card with its episode and numbers scenes within the episode", () => {
    const data = season([2, 3]);
    expect(data.episodes[1].export.cards.map((c) => `${c.episode}.${c.number}`)).toEqual(["2.1", "2.2", "2.3"]);
    expect(data.episodes[0].export.title).toBe("Episode 1: Episode 1 title");
  });

  it("starts each episode's index cards on a fresh sheet", async () => {
    // 2 + 5 + 4 cards -> 1 + 2 + 1 sheets, not 3
    expect(pages(await toBuffer(renderSeasonCardsPdf(season([2, 5, 4]))))).toBe(4);
  });

  it("skips episodes with no cards on the card sheets but keeps their outline page", async () => {
    expect(pages(await toBuffer(renderSeasonCardsPdf(season([3, 0, 3]))))).toBe(2);
    expect(pages(await toBuffer(renderSeasonOutlinePdf(season([3, 0, 3]))))).toBe(3);
  });

  it("still makes a PDF for a season with nothing in it", async () => {
    for (const doc of [renderSeasonCardsPdf(season([])), renderSeasonOutlinePdf(season([]))]) {
      expect((await toBuffer(doc)).subarray(0, 4).toString()).toBe("%PDF");
    }
  });
});
