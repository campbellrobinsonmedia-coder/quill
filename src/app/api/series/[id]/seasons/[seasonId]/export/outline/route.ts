import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listScenes, type DraftContent } from "@/lib/draft-content";
import { templateLabel } from "@/lib/format-templates";
import { buildSeasonExport } from "@/lib/outline-export";
import { renderSeasonCardsPdf, renderSeasonOutlinePdf } from "@/lib/outline-pdf";

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ?kind=cards  every episode's scenes as 3x5 index cards, a fresh sheet per episode
// ?kind=outline  every episode's outline, one page each (the default)
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

  const kind = new URL(request.url).searchParams.get("kind") === "cards" ? "cards" : "outline";

  const season = await prisma.season.findFirst({
    where: { id: seasonId, seriesId: id, series: { userId } },
    include: {
      series: { select: { title: true } },
      episodes: {
        where: { status: "ACTIVE" },
        orderBy: { episodeNumber: "asc" },
        include: {
          draft: { select: { content: true } },
          outlineCards: {
            orderBy: { order: "asc" },
            include: { characters: { select: { name: true } } },
          },
          beats: {
            where: { seasonId: null, seriesId: null },
            orderBy: { order: "asc" },
            select: { id: true, title: true, summary: true, order: true },
          },
        },
      },
    },
  });
  if (!season) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const seasonLabel = `Season ${season.number}${season.title ? `: ${season.title}` : ""}`;
  const data = buildSeasonExport({
    seriesTitle: season.series.title,
    seasonLabel,
    episodes: season.episodes.map((ep) => {
      const scenes = ep.draft ? listScenes(ep.draft.content as unknown as DraftContent) : [];
      return {
        number: ep.episodeNumber,
        title: ep.episodeTitle || ep.title,
        logline: ep.logline,
        format: templateLabel(ep.formatTemplate),
        beats: ep.beats,
        cards: ep.outlineCards,
        sceneLabels: Object.fromEntries(scenes.map((s) => [s.id, s.label])),
      };
    }),
  });

  const doc = kind === "cards" ? renderSeasonCardsPdf(data) : renderSeasonOutlinePdf(data);
  const buffer = await bufferFromDoc(doc);
  const base = season.series.title.replace(/[^\w\- ]+/g, "").trim() || "series";
  const filename = `${base}-season-${season.number}-${kind === "cards" ? "index-cards" : "outline"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
