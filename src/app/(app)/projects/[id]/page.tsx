import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { OutlineBoard } from "@/components/outline-board";
import { BeatBoard } from "@/components/beat-board";
import { listScenes, type DraftContent } from "@/lib/draft-content";

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

  const [cards, characters, draft, beats] = await Promise.all([
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
      select: { id: true, title: true, summary: true, projectId: true, linkedCardId: true },
    }),
  ]);

  const availableScenes = draft
    ? listScenes(draft.content as unknown as DraftContent)
    : [];

  const cardOptions = cards.map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <section className="space-y-3 border-b border-neutral-200 p-6 pb-6 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-500">Beats</h3>
        <BeatBoard
          key={id}
          scope={{ projectId: id }}
          initialBeats={beats}
          cardOptions={cardOptions}
          placeholder="New beat (e.g. Opening image)…"
          emptyMessage="No beats yet — sketch the high-level shape here before breaking it into scenes below."
        />
      </section>
      <OutlineBoard
        key={id}
        projectId={id}
        initialCards={cards}
        availableCharacters={characters}
        availableScenes={availableScenes}
      />
    </div>
  );
}
