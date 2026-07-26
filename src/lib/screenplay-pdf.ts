import PDFDocument from "pdfkit";
import type { ScreenplayContent, ScreenplayElement } from "@/lib/draft-content";

// Industry-standard US Letter screenplay layout, in points (72pt = 1in).
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const TOP_MARGIN = 72; // 1in
const BOTTOM_Y = PAGE_HEIGHT - 72; // 1in bottom margin
const LEFT_MARGIN = 108; // 1.5in, room for binding
const RIGHT_EDGE = 540; // 1in right margin
const FULL_WIDTH = RIGHT_EDGE - LEFT_MARGIN; // 6in

const CHARACTER_X = 266; // ~3.7in from page edge
const PARENTHETICAL_X = 223; // ~3.1in
const DIALOGUE_X = 180; // ~2.5in
const DIALOGUE_WIDTH = RIGHT_EDGE - DIALOGUE_X; // ~3.5in

const FONT_SIZE = 12;
const LINE_HEIGHT = 12; // 6 lines/inch, standard

function textOptions(width: number) {
  return { width, lineGap: 0 } as const;
}

function blockHeight(doc: PDFKit.PDFDocument, el: ScreenplayElement): number {
  switch (el.type) {
    case "scene_heading":
    case "action":
      return doc.heightOfString(el.text || " ", textOptions(FULL_WIDTH)) + LINE_HEIGHT;
    case "character":
      return LINE_HEIGHT;
    case "parenthetical":
      return doc.heightOfString(el.text, textOptions(190)) ;
    case "dialogue":
      return doc.heightOfString(el.text || " ", textOptions(DIALOGUE_WIDTH)) + LINE_HEIGHT;
    case "transition":
      return LINE_HEIGHT + LINE_HEIGHT;
  }
}

// Group elements so a character cue never gets separated from its dialogue
// across a page break (a simpler, still-professional stand-in for the
// (MORE)/(CONT'D) convention full screenwriting software uses).
function groupBlocks(elements: ScreenplayElement[]): ScreenplayElement[][] {
  const blocks: ScreenplayElement[][] = [];
  for (const el of elements) {
    const prevBlock = blocks[blocks.length - 1];
    const continuesDialogue =
      prevBlock &&
      ["character", "parenthetical", "dialogue"].includes(
        prevBlock[prevBlock.length - 1].type
      ) &&
      ["parenthetical", "dialogue"].includes(el.type);
    if (continuesDialogue) {
      prevBlock.push(el);
    } else {
      blocks.push([el]);
    }
  }
  return blocks;
}

export function renderScreenplayPdf(
  content: ScreenplayContent,
  title: string
): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: TOP_MARGIN, bottom: 72, left: LEFT_MARGIN, right: 72 },
    bufferPages: true,
    info: { Title: title },
  });
  doc.font("Courier").fontSize(FONT_SIZE);

  // Title page
  doc.fontSize(14);
  doc.text(title.toUpperCase(), 0, PAGE_HEIGHT / 3, {
    width: PAGE_WIDTH,
    align: "center",
  });
  doc.fontSize(12);
  doc.text(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    0,
    PAGE_HEIGHT - 108,
    { width: PAGE_WIDTH, align: "center" }
  );
  doc.fontSize(FONT_SIZE);

  doc.addPage();
  let y = TOP_MARGIN;

  function ensureRoom(height: number) {
    if (y + height > BOTTOM_Y) {
      doc.addPage();
      y = TOP_MARGIN;
    }
  }

  function writeElement(el: ScreenplayElement) {
    switch (el.type) {
      case "scene_heading": {
        doc.text(el.text.toUpperCase(), LEFT_MARGIN, y, textOptions(FULL_WIDTH));
        y = doc.y + LINE_HEIGHT;
        break;
      }
      case "action": {
        doc.text(el.text, LEFT_MARGIN, y, textOptions(FULL_WIDTH));
        y = doc.y + LINE_HEIGHT;
        break;
      }
      case "character": {
        doc.text(el.text.toUpperCase(), CHARACTER_X, y, textOptions(190));
        y += LINE_HEIGHT;
        break;
      }
      case "parenthetical": {
        const text = el.text.startsWith("(") ? el.text : `(${el.text})`;
        doc.text(text, PARENTHETICAL_X, y, textOptions(190));
        y = doc.y;
        break;
      }
      case "dialogue": {
        doc.text(el.text, DIALOGUE_X, y, textOptions(DIALOGUE_WIDTH));
        y = doc.y + LINE_HEIGHT;
        break;
      }
      case "transition": {
        doc.text(el.text.toUpperCase(), LEFT_MARGIN, y, {
          width: FULL_WIDTH,
          lineGap: 0,
          align: "right",
        });
        y += LINE_HEIGHT * 2;
        break;
      }
    }
  }

  const blocks = groupBlocks(content.elements);
  for (const block of blocks) {
    const height = block.reduce((sum, el) => sum + blockHeight(doc, el), 0);
    ensureRoom(height);
    for (const el of block) {
      ensureRoom(blockHeight(doc, el));
      writeElement(el);
    }
  }

  // Page numbers: top-right, skipping the title page and the first script page.
  const range = doc.bufferedPageRange();
  for (let i = 2; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(12);
    doc.text(`${i}.`, RIGHT_EDGE - 60, 40, { width: 60, align: "right" });
  }

  return doc;
}
