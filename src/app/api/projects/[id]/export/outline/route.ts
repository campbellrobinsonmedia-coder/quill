import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listScenes, type DraftContent } from "@/lib/draft-content";
import { templateLabel } from "@/lib/format-templates";
import { buildOutlineExport } from "@/lib/outline-export";
import { renderIndexCardsPdf, renderOutlinePdf } from "@/lib/outline-pdf";

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

// ?kind=cards  printable 3x5 index cards (four to a landscape sheet)
// ?kind=outline  the whole outline as a one-page PDF (the default)
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

  const kind = new URL(request.url).searchParams.get("kind") === "cards" ? "cards" : "outline";

  const project = await prisma.project.findFirst({
    where: { id, userId },
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
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scenes = project.draft ? listScenes(project.draft.content as unknown as DraftContent) : [];
  const data = buildOutlineExport({
    title: project.title,
    logline: project.logline,
    author: project.titlePageAuthor,
    format: templateLabel(project.formatTemplate),
    beats: project.beats,
    cards: project.outlineCards,
    sceneLabels: Object.fromEntries(scenes.map((s) => [s.id, s.label])),
  });

  const doc = kind === "cards" ? renderIndexCardsPdf(data) : renderOutlinePdf(data);
  const buffer = await bufferFromDoc(doc);
  const base = project.title.replace(/[^\w\- ]+/g, "").trim() || "outline";
  const filename = `${base}-${kind === "cards" ? "index-cards" : "outline"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
