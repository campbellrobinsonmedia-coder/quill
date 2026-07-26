import PDFDocument from "pdfkit";
import {
  computeSceneNumbers,
  type ScreenplayContent,
  type ScreenplayElement,
} from "@/lib/draft-content";

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

const DIALOGUE_CHAIN = ["character", "parenthetical", "dialogue"];

export type PdfOptions = {
  title: string;
  author?: string | null;
  contact?: string | null;
  basedOn?: string | null;
  revisionColor?: string | null;
  revisionBaseline?: ScreenplayContent | null;
  sceneNumbersLocked?: boolean;
  watermark?: string | null;
};

function textOptions(width: number) {
  return { width, lineGap: 0 } as const;
}

function elementSignature(el: ScreenplayElement): string {
  return `${el.type}|${el.text}`;
}

type RenderUnit =
  | { kind: "omitted"; heading: ScreenplayElement }
  | { kind: "dual"; blockA: ScreenplayElement[]; blockB: ScreenplayElement[] }
  | { kind: "block"; elements: ScreenplayElement[] };

function collectChain(elements: ScreenplayElement[], start: number) {
  const block = [elements[start]];
  let i = start + 1;
  while (i < elements.length && DIALOGUE_CHAIN.includes(elements[i].type)) {
    if (elements[i].type === "character") break;
    block.push(elements[i]);
    i++;
  }
  return { block, nextIndex: i };
}

function buildRenderUnits(elements: ScreenplayElement[]): RenderUnit[] {
  const units: RenderUnit[] = [];
  let i = 0;
  while (i < elements.length) {
    const el = elements[i];

    if (el.type === "scene_heading" && el.omitted) {
      units.push({ kind: "omitted", heading: el });
      i++;
      while (i < elements.length && elements[i].type !== "scene_heading") i++;
      continue;
    }

    if (el.type === "character" && el.dualGroup) {
      const { block: blockA, nextIndex } = collectChain(elements, i);
      const nextEl = elements[nextIndex];
      if (nextEl?.type === "character" && nextEl.dualGroup === el.dualGroup) {
        const { block: blockB, nextIndex: afterB } = collectChain(elements, nextIndex);
        units.push({ kind: "dual", blockA, blockB });
        i = afterB;
        continue;
      }
    }

    if (DIALOGUE_CHAIN.includes(el.type)) {
      const { block, nextIndex } = collectChain(elements, i);
      units.push({ kind: "block", elements: block });
      i = nextIndex;
      continue;
    }

    units.push({ kind: "block", elements: [el] });
    i++;
  }
  return units;
}

function elementHeight(
  doc: PDFKit.PDFDocument,
  el: ScreenplayElement,
  width: number,
  isDialogue: boolean
): number {
  if (el.type === "character") return LINE_HEIGHT;
  if (el.type === "parenthetical") return doc.heightOfString(el.text, textOptions(width));
  if (el.type === "scene_heading" || el.type === "action") {
    return doc.heightOfString(el.text || " ", textOptions(width)) + LINE_HEIGHT;
  }
  if (el.type === "dialogue") {
    const h = doc.heightOfString(el.text || " ", textOptions(width));
    return isDialogue ? h + LINE_HEIGHT : h;
  }
  return LINE_HEIGHT * 2; // transition
}

export function renderScreenplayPdf(
  content: ScreenplayContent,
  options: PdfOptions
): PDFKit.PDFDocument {
  const { title, author, contact, basedOn, revisionColor, revisionBaseline, watermark } = options;

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
  if (author) {
    doc.text("Written by", 0, PAGE_HEIGHT / 3 + 50, { width: PAGE_WIDTH, align: "center" });
    doc.text(author, 0, PAGE_HEIGHT / 3 + 68, { width: PAGE_WIDTH, align: "center" });
  }
  if (basedOn) {
    doc.text(basedOn, 0, PAGE_HEIGHT / 3 + 100, { width: PAGE_WIDTH, align: "center" });
  }
  if (contact) {
    doc.text(contact, LEFT_MARGIN, PAGE_HEIGHT - 140, { width: 200, align: "left", lineGap: 2 });
  }
  const draftDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(
    revisionColor ? `${revisionColor} Revision — ${draftDate}` : draftDate,
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

  const baselineMap = new Map<string, string>();
  if (revisionBaseline) {
    for (const el of revisionBaseline.elements) baselineMap.set(el.id, elementSignature(el));
  }
  function markRevised(el: ScreenplayElement, atY: number) {
    if (!revisionBaseline) return;
    if (baselineMap.get(el.id) !== elementSignature(el)) {
      doc.text("*", RIGHT_EDGE + 4, atY, { width: 20 });
    }
  }

  const sceneNumbers = computeSceneNumbers(content.elements, !!options.sceneNumbersLocked);

  function writeSceneHeading(el: ScreenplayElement) {
    const num = sceneNumbers.get(el.id) ?? "";
    doc.text(num, LEFT_MARGIN - 30, y, { width: 24 });
    doc.text(el.text.toUpperCase(), LEFT_MARGIN, y, textOptions(FULL_WIDTH));
    doc.text(num, RIGHT_EDGE + 4, y, { width: 24 });
    markRevised(el, y);
    y = doc.y + LINE_HEIGHT;
  }

  function writeChainElement(el: ScreenplayElement, x: number, width: number, isDialogue: boolean) {
    if (el.type === "character") {
      doc.text(el.text.toUpperCase(), x, y, textOptions(width));
      markRevised(el, y);
      y += LINE_HEIGHT;
    } else if (el.type === "parenthetical") {
      const text = el.text.startsWith("(") ? el.text : `(${el.text})`;
      doc.text(text, x, y, textOptions(width));
      markRevised(el, y);
      y = doc.y;
    } else if (el.type === "dialogue") {
      doc.text(el.text, x, y, textOptions(width));
      markRevised(el, y);
      y = doc.y + (isDialogue ? LINE_HEIGHT : 0);
    }
  }

  function writeUnit(unit: RenderUnit) {
    if (unit.kind === "omitted") {
      const num = sceneNumbers.get(unit.heading.id) ?? "";
      doc.text(num, LEFT_MARGIN - 30, y, { width: 24 });
      doc.text(`${unit.heading.text || "SCENE"} — OMITTED`, LEFT_MARGIN, y, textOptions(FULL_WIDTH));
      y = doc.y + LINE_HEIGHT;
      return;
    }

    if (unit.kind === "dual") {
      const gutter = 18;
      const colWidth = (FULL_WIDTH - gutter) / 2;
      const leftX = LEFT_MARGIN;
      const rightX = LEFT_MARGIN + colWidth + gutter;
      const startY = y;

      let leftY = startY;
      for (const el of unit.blockA) {
        y = leftY;
        writeChainElement(el, leftX + (el.type === "character" ? 12 : 0), colWidth - (el.type === "character" ? 12 : 0), true);
        leftY = y;
      }

      let rightY = startY;
      for (const el of unit.blockB) {
        y = rightY;
        writeChainElement(el, rightX + (el.type === "character" ? 12 : 0), colWidth - (el.type === "character" ? 12 : 0), true);
        rightY = y;
      }

      y = Math.max(leftY, rightY);
      return;
    }

    // normal block: scene_heading, action, transition (single) or a
    // character/parenthetical/dialogue chain
    const first = unit.elements[0];
    if (first.type === "scene_heading") {
      writeSceneHeading(first);
      return;
    }
    if (first.type === "action") {
      doc.text(first.text, LEFT_MARGIN, y, textOptions(FULL_WIDTH));
      markRevised(first, y);
      y = doc.y + LINE_HEIGHT;
      return;
    }
    if (first.type === "transition") {
      doc.text(first.text.toUpperCase(), LEFT_MARGIN, y, {
        width: FULL_WIDTH,
        lineGap: 0,
        align: "right",
      });
      markRevised(first, y);
      y += LINE_HEIGHT * 2;
      return;
    }
    // character/parenthetical/dialogue chain
    for (const el of unit.elements) {
      if (el.type === "character") writeChainElement(el, CHARACTER_X, 190, false);
      else if (el.type === "parenthetical") writeChainElement(el, PARENTHETICAL_X, 190, false);
      else writeChainElement(el, DIALOGUE_X, DIALOGUE_WIDTH, true);
    }
  }

  function unitHeight(unit: RenderUnit): number {
    if (unit.kind === "omitted") return LINE_HEIGHT * 2;
    if (unit.kind === "dual") {
      const gutter = 18;
      const colWidth = (FULL_WIDTH - gutter) / 2;
      const heightOf = (els: ScreenplayElement[]) =>
        els.reduce((sum, el) => sum + elementHeight(doc, el, colWidth, true), 0);
      return Math.max(heightOf(unit.blockA), heightOf(unit.blockB));
    }
    const first = unit.elements[0];
    if (first.type === "scene_heading" || first.type === "action") {
      return elementHeight(doc, first, FULL_WIDTH, false);
    }
    if (first.type === "transition") return LINE_HEIGHT * 2;
    return unit.elements.reduce((sum, el) => {
      const width = el.type === "dialogue" ? DIALOGUE_WIDTH : 190;
      return sum + elementHeight(doc, el, width, el.type === "dialogue");
    }, 0);
  }

  const units = buildRenderUnits(content.elements);
  for (const unit of units) {
    ensureRoom(unitHeight(unit));
    writeUnit(unit);
  }

  // Page numbers: top-right, skipping the title page and the first script page.
  const range = doc.bufferedPageRange();
  for (let i = 2; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(12);
    doc.text(`${i}.`, RIGHT_EDGE - 60, 40, { width: 60, align: "right" });
  }

  if (watermark) {
    for (let i = 1; i < range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.fillOpacity(0.15);
      doc.fontSize(48);
      doc.rotate(-45, { origin: [PAGE_WIDTH / 2, PAGE_HEIGHT / 2] });
      doc.text(watermark, 0, PAGE_HEIGHT / 2 - 24, { width: PAGE_WIDTH, align: "center" });
      doc.restore();
      doc.fontSize(FONT_SIZE);
    }
  }

  return doc;
}
