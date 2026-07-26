import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toFDX } from "@/lib/fdx";
import type { DraftContent } from "@/lib/draft-content";

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
      { error: "FDX export is only available for screenplay projects" },
      { status: 400 }
    );
  }

  const fdx = toFDX(content, project.title);
  const filename = `${project.title.replace(/[^\w\- ]+/g, "").trim() || "screenplay"}.fdx`;

  return new NextResponse(fdx, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
