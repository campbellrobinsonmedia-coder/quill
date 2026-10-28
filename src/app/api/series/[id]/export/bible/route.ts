import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildSeriesBible } from "@/lib/series-bible";
import { renderSeriesBiblePdf } from "@/lib/series-bible-pdf";

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const series = await prisma.series.findFirst({
    where: { id, userId },
    include: {
      beats: { orderBy: { order: "asc" }, select: { title: true, summary: true } },
      characters: {
        orderBy: { createdAt: "asc" },
        select: { name: true, description: true, arcNotes: true, relationships: true },
      },
      worldNotes: {
        orderBy: { createdAt: "asc" },
        select: { title: true, category: true, description: true },
      },
      seasons: {
        orderBy: { number: "asc" },
        select: {
          number: true,
          title: true,
          beats: { orderBy: { order: "asc" }, select: { title: true, summary: true } },
          episodes: {
            where: { status: "ACTIVE" },
            orderBy: { episodeNumber: "asc" },
            select: { episodeNumber: true, episodeTitle: true, title: true, logline: true },
          },
        },
      },
    },
  });
  if (!series) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = renderSeriesBiblePdf(
    buildSeriesBible({
      title: series.title,
      format: series.format,
      premise: series.premise,
      beats: series.beats,
      characters: series.characters,
      worldNotes: series.worldNotes,
      seasons: series.seasons,
    })
  );
  const buffer = await bufferFromDoc(doc);
  const filename = `${series.title.replace(/[^\w\- ]+/g, "").trim() || "series"}-bible.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
