import PDFDocument from "pdfkit";

export type SeasonPitchData = {
  seriesTitle: string;
  format: string | null;
  premise: string | null;
  seasonNumber: number;
  seasonTitle: string | null;
  episodes: { number: number | null; title: string; logline: string | null }[];
  beats: { title: string; summary: string | null }[];
};

const MARGIN = 72;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function renderSeasonPitchPdf(data: SeasonPitchData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "LETTER", margin: MARGIN });

  doc.font("Helvetica-Bold").fontSize(24).text(data.seriesTitle);
  const seasonLine = `Season ${data.seasonNumber}${
    data.seasonTitle ? `: ${data.seasonTitle}` : ""
  }`;
  doc.font("Helvetica").fontSize(14).fillColor("#555").text(seasonLine);
  if (data.format) {
    doc.fontSize(10).text(data.format.charAt(0).toUpperCase() + data.format.slice(1));
  }
  doc.fillColor("#000");
  doc.moveDown();

  if (data.premise) {
    doc.font("Helvetica-Bold").fontSize(11).text("Premise");
    doc.font("Helvetica").fontSize(11).text(data.premise, { width: CONTENT_WIDTH });
    doc.moveDown();
  }

  if (data.beats.length > 0) {
    doc.font("Helvetica-Bold").fontSize(11).text("Season Arc");
    doc.moveDown(0.25);
    for (const beat of data.beats) {
      doc.font("Helvetica-Bold").fontSize(10).text(beat.title, { width: CONTENT_WIDTH });
      if (beat.summary) {
        doc.font("Helvetica").fontSize(10).fillColor("#333")
          .text(beat.summary, { width: CONTENT_WIDTH });
        doc.fillColor("#000");
      }
      doc.moveDown(0.5);
    }
    doc.moveDown(0.5);
  }

  doc.font("Helvetica-Bold").fontSize(11).text("Episodes");
  doc.moveDown(0.25);
  for (const ep of data.episodes) {
    if (doc.y > 700) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(10)
      .text(`${ep.number ?? "?"}. ${ep.title}`, { width: CONTENT_WIDTH });
    if (ep.logline) {
      doc.font("Helvetica").fontSize(10).fillColor("#333")
        .text(ep.logline, { width: CONTENT_WIDTH });
      doc.fillColor("#000");
    }
    doc.moveDown(0.5);
  }

  return doc;
}
