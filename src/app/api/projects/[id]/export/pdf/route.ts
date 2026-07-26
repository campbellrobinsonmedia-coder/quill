import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderScreenplayPdf } from "@/lib/screenplay-pdf";
import type { DraftContent } from "@/lib/draft-content";

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
  _request: Request,
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

  const doc = renderScreenplayPdf(content, project.title);
  const buffer = await bufferFromDoc(doc);
  const filename = `${project.title.replace(/[^\w\- ]+/g, "").trim() || "screenplay"}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
