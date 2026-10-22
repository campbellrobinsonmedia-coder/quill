import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { PlanBoard } from "@/components/plan-board";
import { listScenes, type DraftContent } from "@/lib/draft-content";
import type { Metadata } from "next";

// A layout's title template doesn't apply to the page in its own segment,
// so the project name is spelled out here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);
  return { title: `Plan · ${project.title}` };
}

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

  const [cards, characters, draft, beats, seasonBeats] = await Promise.all([
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
        linkedSceneId: true,
        beatId: true,
        order: true,
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
    prisma.draft.findUnique({
      where: { projectId: id },
      select: { content: true },
    }),
    prisma.beat.findMany({
      where: { projectId: id, seasonId: null, seriesId: null },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        summary: true,
        order: true,
        references: {
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, url: true, label: true, note: true, fileType: true },
        },
      },
    }),
    // Beats from the season arc that were assigned to this episode.
    project.seasonId
      ? prisma.beat.findMany({
          where: { seasonId: project.seasonId, projectId: id },
          orderBy: { order: "asc" },
          select: { id: true, title: true, summary: true },
        })
      : Promise.resolve([]),
  ]);

  const availableScenes = draft
    ? listScenes(draft.content as unknown as DraftContent)
    : [];

  return (
    <PlanBoard
      key={id}
      projectId={id}
      initialBeats={beats}
      initialCards={cards}
      availableCharacters={characters}
      availableScenes={availableScenes}
      seasonBeats={seasonBeats}
    />
  );
}
