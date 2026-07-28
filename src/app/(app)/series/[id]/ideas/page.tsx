import { prisma } from "@/lib/prisma";
import { getSeriesOrNotFound } from "@/lib/get-series";
import { NewSeriesIdeaForm } from "./new-series-idea-form";
import { SeriesIdeaItem } from "./series-idea-item";

export default async function SeriesIdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSeriesOrNotFound(id);

  const [seasons, ideas] = await Promise.all([
    prisma.season.findMany({
      where: { seriesId: id },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        title: true,
        episodes: {
          orderBy: { episodeNumber: "asc" },
          select: { id: true, title: true, episodeNumber: true },
        },
      },
    }),
    prisma.idea.findMany({
      where: { seriesId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-xs text-neutral-500">
        Ideas here live at the series level — leave one general, or link it to
        a specific season or episode.
      </p>
      <NewSeriesIdeaForm seriesId={id} seasons={seasons} />
      {ideas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No ideas yet — capture one above.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {ideas.map((idea) => (
            <SeriesIdeaItem
              key={idea.id}
              id={idea.id}
              content={idea.content}
              createdAt={idea.createdAt.toLocaleDateString()}
              seasonId={idea.seasonId}
              projectId={idea.projectId}
              seasons={seasons}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
