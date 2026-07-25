import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { OutlineBoard } from "@/components/outline-board";

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProjectOrNotFound(id);

  const cards = await prisma.outlineCard.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    select: { id: true, title: true, summary: true, colorTag: true, act: true },
  });

  return <OutlineBoard projectId={id} initialCards={cards} />;
}
