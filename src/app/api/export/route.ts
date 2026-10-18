import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, ideas, projects, series] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, createdAt: true, dailyWordGoal: true },
    }),
    prisma.idea.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        characters: { include: { references: true } },
        outlineCards: {
          orderBy: { order: "asc" },
          include: { characters: { select: { id: true } } },
        },
        worldNotes: { include: { references: true } },
        beats: { orderBy: { order: "asc" }, include: { references: true } },
        draft: { include: { versions: true, comments: true } },
      },
    }),
    prisma.series.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        seasons: {
          orderBy: { number: "asc" },
          include: {
            beats: { orderBy: { order: "asc" }, include: { references: true } },
            references: true,
          },
        },
        characters: { include: { references: true } },
        worldNotes: { include: { references: true } },
        beats: { orderBy: { order: "asc" }, include: { references: true } },
        references: true,
      },
    }),
  ]);

  const backup = {
    app: "Quill",
    exportedAt: new Date().toISOString(),
    note: "Uploaded files are referenced by URL (Vercel Blob); the files themselves are not embedded.",
    user,
    ideas,
    projects,
    series,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="quill-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
