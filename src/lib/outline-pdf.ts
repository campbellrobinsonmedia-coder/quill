import PDFDocument from "pdfkit";
import type { ExportCard, OutlineExport } from "@/lib/outline-export";

// Two printable versions of the Plan board: 3x5 index cards to cut out and pin
// up, and the whole story as a one-page outline (or treatment).

// ---- Index cards: 5in x 3in, four to a landscape letter sheet ---------------

const SHEET_W = 792;
const SHEET_H = 612;
const CARD_W = 360;
const CARD_H = 180; // 3in
const PER_ROW = 2;
const PER_SHEET = 4;
const PAD = 12;
const GRID_X = (SHEET_W - CARD_W * PER_ROW) / 2;
const GRID_Y = (SHEET_H - CARD_H * 2) / 2;
const BODY_SIZES = [10, 9.5, 9, 8.5, 8, 7.5, 7];

function drawCard(doc: PDFKit.PDFDocument, card: ExportCard, x: number, y: number) {
  const innerX = x + PAD + 4;
  const innerW = CARD_W - PAD * 2 - 4;

  // Cut guide and the colour stripe down the left edge.
  doc.save().lineWidth(0.5).dash(3, { space: 3 }).strokeColor("#aaaaaa").rect(x, y, CARD_W, CARD_H).stroke().undash().restore();
  doc.save().rect(x + 1, y + 1, 4, CARD_H - 2).fill(card.color).restore();

  // Top line: number and heading (or beat), storyline on the right.
  const top = y + PAD;
  const label = [String(card.number), card.heading ?? card.beat ?? ""].filter(Boolean).join("   ");
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#666666");
  doc.text(label.toUpperCase(), innerX, top, { width: innerW - 24, height: 10, ellipsis: true, lineBreak: false });
  if (card.storyThread) {
    doc.text(card.storyThread.toUpperCase().slice(0, 3), innerX + innerW - 24, top, { width: 24, align: "right", lineBreak: false });
  }

  // Title.
  let cursor = top + 14;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000");
  const titleH = Math.min(doc.heightOfString(card.title, { width: innerW }), 30);
  doc.text(card.title, innerX, cursor, { width: innerW, height: 30, ellipsis: true });
  cursor += titleH + 4;

  // Footer: who and where, pinned to the bottom edge.
  const footer = [card.characters.join(", "), card.heading ? "" : card.location].filter(Boolean).join("  |  ");
  const footerH = footer ? 12 : 0;
  const bottom = y + CARD_H - PAD;
  if (footer) {
    doc.font("Helvetica").fontSize(8).fillColor("#666666");
    doc.text(footer, innerX, bottom - 9, { width: innerW, height: 10, ellipsis: true, lineBreak: false });
  }

  // The turn sits above the footer; what happens takes whatever room is left.
  let turnH = 0;
  if (card.turn) {
    doc.font("Helvetica-Oblique").fontSize(9);
    turnH = Math.min(doc.heightOfString(`Turn: ${card.turn}`, { width: innerW }), 24) + 3;
    doc.fillColor("#444444").text(`Turn: ${card.turn}`, innerX, bottom - footerH - turnH + 3, {
      width: innerW,
      height: turnH - 3,
      ellipsis: true,
    });
  }

  if (card.summary) {
    const room = bottom - footerH - turnH - cursor - 2;
    doc.font("Helvetica").fillColor("#222222");
    let size = BODY_SIZES[BODY_SIZES.length - 1];
    for (const s of BODY_SIZES) {
      doc.fontSize(s);
      if (doc.heightOfString(card.summary, { width: innerW }) <= room) {
        size = s;
        break;
      }
    }
    doc.fontSize(size).text(card.summary, innerX, cursor, { width: innerW, height: Math.max(room, 10), ellipsis: true });
  }
}

export function renderIndexCardsPdf(data: OutlineExport): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: [SHEET_W, SHEET_H],
    margin: 0,
    info: { Title: `${data.title} - index cards` },
  });

  if (data.cards.length === 0) {
    doc.font("Helvetica").fontSize(12).fillColor("#555555").text("No scene cards yet.", 36, 36);
    return doc;
  }

  data.cards.forEach((card, i) => {
    const slot = i % PER_SHEET;
    if (i > 0 && slot === 0) doc.addPage();
    drawCard(
      doc,
      card,
      GRID_X + (slot % PER_ROW) * CARD_W,
      GRID_Y + Math.floor(slot / PER_ROW) * CARD_H
    );
  });
  return doc;
}

// ---- Outline: the whole story on a page ------------------------------------

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const OUTLINE_W = PAGE_W - MARGIN * 2;
const OUTLINE_SIZES = [10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7];

function sceneParagraph(card: ExportCard) {
  const lead = `${card.number}. ${card.heading ? `${card.heading} - ` : ""}${card.title}. `;
  const rest = [card.summary.replace(/\n+/g, " "), card.turn ? `Turn: ${card.turn}` : ""]
    .filter(Boolean)
    .join(" ");
  return { lead, rest };
}

// Height of everything at a given size, so the largest size that still fits
// one page can be chosen before anything is drawn.
function outlineHeight(doc: PDFKit.PDFDocument, data: OutlineExport, size: number): number {
  let h = 0;
  for (const group of data.groups) {
    doc.font("Helvetica-Bold").fontSize(size + 1);
    h += doc.heightOfString(group.label, { width: OUTLINE_W }) + size * 0.6;
    for (const card of group.cards) {
      const { lead, rest } = sceneParagraph(card);
      doc.font("Helvetica-Bold").fontSize(size);
      // Bold runs wider than regular; measuring it all in bold errs on the safe side.
      h += doc.heightOfString(lead + rest, { width: OUTLINE_W - 14 }) + size * 0.35;
    }
    h += size * 0.5;
  }
  return h;
}

export function renderOutlinePdf(data: OutlineExport): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: `${data.title} - outline` },
  });

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#000000").text(data.title, { width: OUTLINE_W });
  const meta = [data.format, data.author ? `by ${data.author}` : ""].filter(Boolean).join("  |  ");
  if (meta) doc.font("Helvetica").fontSize(9).fillColor("#666666").text(meta);
  if (data.logline) {
    doc.moveDown(0.3).font("Helvetica-Oblique").fontSize(10).fillColor("#333333").text(data.logline, { width: OUTLINE_W });
  }
  doc.moveDown(0.8);

  if (data.cards.length === 0) {
    doc.font("Helvetica").fontSize(11).fillColor("#555555").text("No scene cards yet.");
    return doc;
  }

  const room = PAGE_H - MARGIN - doc.y;
  const size = OUTLINE_SIZES.find((s) => outlineHeight(doc, data, s) <= room) ?? 9;

  for (const group of data.groups) {
    doc.font("Helvetica-Bold").fontSize(size + 1).fillColor("#000000").text(group.label.toUpperCase(), { width: OUTLINE_W });
    doc.moveDown(0.2);
    for (const card of group.cards) {
      const { lead, rest } = sceneParagraph(card);
      doc.font("Helvetica-Bold").fontSize(size).fillColor("#000000").text(lead, MARGIN + 14, doc.y, { width: OUTLINE_W - 14, continued: rest.length > 0 });
      if (rest) doc.font("Helvetica").fillColor("#222222").text(rest, { width: OUTLINE_W - 14 });
      doc.moveDown(0.25);
    }
    doc.moveDown(0.4);
    doc.x = MARGIN;
  }
  return doc;
}
