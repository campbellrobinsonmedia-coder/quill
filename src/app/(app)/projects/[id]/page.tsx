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

  const [cards, characters] = await Promise.all([
    prisma.outlineCard.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        summary: true,
        colorTag: true,
        act: true,
        location: true,
        emotion: true,
        characters: { select: { id: true, name: true } },
      },
    }),
    prisma.character.findMany({
      where: { projectId: id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <OutlineBoard
      projectId={id}
      initialCards={cards}
      availableCharacters={characters}
    />
  );
}
