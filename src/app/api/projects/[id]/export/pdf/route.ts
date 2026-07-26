import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderScreenplayPdf } from "@/lib/screenplay-pdf";
import type { DraftContent, ScreenplayContent } from "@/lib/draft-content";

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

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: { draft: true },
  });
  if (!project || !project.draft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content = project.draft.content as unknown as DraftContent;
  if (content.type !== "screenplay") {
    return NextResponse.json(
      { error: "PDF export is only available for screenplay projects" },
      { status: 400 }
    );
  }

  let revisionBaseline: ScreenplayContent | null = null;
  let revisionColor: string | null = null;
  if (project.draft.lastLockedVersionId) {
    const version = await prisma.draftVersion.findUnique({
      where: { id: project.draft.lastLockedVersionId },
      select: { content: true, revisionColor: true },
    });
    if (version) {
      revisionBaseline = version.content as unknown as ScreenplayContent;
      revisionColor = version.revisionColor;
    }
  }

  const watermark = new URL(request.url).searchParams.get("watermark");

  const doc = renderScreenplayPdf(content, {
    title: project.title,
    author: project.titlePageAuthor,
    contact: project.titlePageContact,
    basedOn: project.titlePageBasedOn,
    revisionColor,
    revisionBaseline,
    sceneNumbersLocked: project.draft.sceneNumbersLocked,
    watermark: watermark || null,
  });
  const buffer = await bufferFromDoc(doc);
  const filename = `${project.title.replace(/[^\w\- ]+/g, "").trim() || "screenplay"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
