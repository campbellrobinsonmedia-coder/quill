import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderSeasonPitchPdf } from "@/lib/season-pitch-pdf";

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; seasonId: string }> }
) {
  const { id, seasonId } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = await prisma.season.findFirst({
    where: { id: seasonId, seriesId: id, series: { userId } },
    include: {
      series: { select: { title: true, format: true, premise: true } },
      episodes: {
        orderBy: { episodeNumber: "asc" },
        select: { episodeNumber: true, episodeTitle: true, title: true, logline: true },
      },
      beats: {
        orderBy: { order: "asc" },
        select: { title: true, summary: true },
      },
    },
  });
  if (!season) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = renderSeasonPitchPdf({
    seriesTitle: season.series.title,
    format: season.series.format,
    premise: season.series.premise,
    seasonNumber: season.number,
    seasonTitle: season.title,
    episodes: season.episodes.map((ep) => ({
      number: ep.episodeNumber,
      title: ep.episodeTitle || ep.title,
      logline: ep.logline,
    })),
    beats: season.beats,
  });
  const buffer = await bufferFromDoc(doc);
  const filename = `${season.series.title.replace(/[^\w\- ]+/g, "").trim() || "series"}-season-${season.number}-pitch.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
