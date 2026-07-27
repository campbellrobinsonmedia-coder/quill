import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { OutlineBoard } from "@/components/outline-board";

export default async function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const season = project.seasonId
    ? await prisma.season.findUnique({
        where: { id: project.seasonId },
        select: { seriesId: true },
      })
    : null;

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
        storyThread: true,
        characters: { select: { id: true, name: true } },
      },
    }),
    prisma.character.findMany({
      where: season
        ? { OR: [{ projectId: id }, { seriesId: season.seriesId }] }
        : { projectId: id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <OutlineBoard
      key={id}
      projectId={id}
      initialCards={cards}
      availableCharacters={characters}
    />
  );
}
