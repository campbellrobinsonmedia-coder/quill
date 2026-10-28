import PDFDocument from "pdfkit";
import type { SeriesBible } from "@/lib/series-bible";

const MARGIN = 72;
const PAGE_W = 612;
const PAGE_H = 792;
const WIDTH = PAGE_W - MARGIN * 2;

// A series bible / pitch document: premise, series arc, characters, world and
// each season's arc and episodes. Sections with nothing in them are left out.
export function renderSeriesBiblePdf(bible: SeriesBible): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: `${bible.title} - series bible` },
  });

  // Keep a heading with at least a few lines of what follows it.
  const room = (needed: number) => {
    if (doc.y > PAGE_H - MARGIN - needed) doc.addPage();
  };
  const heading = (text: string) => {
    room(90);
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#000000").text(text.toUpperCase(), { width: WIDTH });
    doc.moveTo(MARGIN, doc.y + 2).lineTo(PAGE_W - MARGIN, doc.y + 2).lineWidth(0.5).strokeColor("#999999").stroke();
    doc.moveDown(0.6);
  };
  const subheading = (text: string) => {
    room(60);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text(text, { width: WIDTH });
  };
  const body = (text: string, opts: { italic?: boolean; indent?: number } = {}) => {
    if (!text) return;
    doc
      .font(opts.italic ? "Helvetica-Oblique" : "Helvetica")
      .fontSize(10)
      .fillColor("#222222")
      .text(text, MARGIN + (opts.indent ?? 0), doc.y, { width: WIDTH - (opts.indent ?? 0) });
    doc.x = MARGIN;
  };
  const labelled = (label: string, text: string) => {
    if (!text) return;
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666").text(label.toUpperCase(), { width: WIDTH });
    body(text);
  };
  const beats = (list: { title: string; summary: string }[]) => {
    list.forEach((b, i) => {
      room(50);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(`${i + 1}. ${b.title}`, { width: WIDTH });
      body(b.summary, { indent: 14 });
      doc.moveDown(0.4);
    });
  };

  // Title block
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#000000").text(bible.title, { width: WIDTH });
  if (bible.format) {
    doc.font("Helvetica").fontSize(11).fillColor("#666666").text(bible.format.charAt(0).toUpperCase() + bible.format.slice(1));
  }
  if (bible.premise) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666").text("PREMISE");
    body(bible.premise);
  }

  const empty =
    !bible.premise && !bible.arc.length && !bible.characters.length && !bible.world.length && !bible.seasons.length;
  if (empty) {
    doc.moveDown();
    body("Nothing here yet — add a premise, characters, world notes or seasons to the series.", { italic: true });
  }

  if (bible.arc.length > 0) {
    heading("Series arc");
    beats(bible.arc);
  }

  if (bible.characters.length > 0) {
    heading("Characters");
    for (const c of bible.characters) {
      subheading(c.name);
      body(c.description);
      labelled("Arc", c.arcNotes);
      labelled("Relationships", c.relationships);
      doc.moveDown(0.7);
    }
  }

  if (bible.world.length > 0) {
    heading("World");
    for (const group of bible.world) {
      if (bible.world.length > 1 || group.category !== "Notes") {
        room(60);
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666").text(group.category.toUpperCase(), { width: WIDTH });
        doc.moveDown(0.2);
      }
      for (const n of group.notes) {
        subheading(n.title);
        body(n.description);
        doc.moveDown(0.5);
      }
      doc.moveDown(0.3);
    }
  }

  for (const season of bible.seasons) {
    heading(season.label);
    if (season.arc.length > 0) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666").text("SEASON ARC");
      doc.moveDown(0.2);
      beats(season.arc);
    }
    if (season.episodes.length > 0) {
      room(60);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#666666").text("EPISODES");
      doc.moveDown(0.2);
      for (const ep of season.episodes) {
        room(40);
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text(`${ep.number ?? "?"}. ${ep.title}`, { width: WIDTH });
        body(ep.logline, { indent: 14 });
        doc.moveDown(0.4);
      }
    }
  }

  // Page numbers, from the second page on. Writing inside the bottom margin
  // would make pdfkit add a page, so the margin is lifted for the footer.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    if (i === 0) continue;
    doc.switchToPage(range.start + i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#888888");
    doc.text(`${bible.title}  |  ${i + 1}`, MARGIN, PAGE_H - 44, { width: WIDTH, align: "center", lineBreak: false });
    doc.page.margins.bottom = bottom;
  }

  return doc;
}
