import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSeriesOrNotFound } from "@/lib/get-series";
import { SeriesMetaForm } from "./series-meta-form";
import { NewSeasonForm } from "./new-season-form";
import { BeatBoard } from "@/components/beat-board";
import { ReferenceList } from "@/components/reference-list";

export default async function SeriesOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesOrNotFound(id);

  const [seasons, beats, references] = await Promise.all([
    prisma.season.findMany({
      where: { seriesId: id },
      orderBy: { number: "asc" },
      include: {
        episodes: {
          select: { id: true, status: true },
        },
      },
    }),
    prisma.beat.findMany({
      where: { seriesId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        summary: true,
        projectId: true,
        linkedCardId: true,
        references: {
          orderBy: { createdAt: "asc" },
          select: { id: true, kind: true, url: true, label: true, note: true, fileType: true },
        },
      },
    }),
    prisma.reference.findMany({
      where: { seriesId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, url: true, label: true, note: true, fileType: true },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Series arc</h2>
        <p className="text-xs text-neutral-400">
          The franchise-wide shape — big strokes across the whole show, above
          any one season.
        </p>
        <BeatBoard
          scope={{ seriesId: id }}
          initialBeats={beats}
          placeholder="New series beat (e.g. Series premise)…"
          emptyMessage="No series-level beats yet — sketch the show's overall shape here."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Moodboard</h2>
        <p className="text-xs text-neutral-400">
          Reference links, songs, and images for the show as a whole.
        </p>
        <ReferenceList scope={{ seriesId: id }} initialReferences={references} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Seasons ({seasons.length})
        </h2>
        <NewSeasonForm seriesId={id} />
        {seasons.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No seasons yet — add one above to start planning episodes.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {seasons.map((season) => {
              const activeCount = season.episodes.filter(
                (e) => e.status === "ACTIVE"
              ).length;
              return (
                <li key={season.id} className="flex items-center justify-between gap-4 p-4">
                  <Link
                    href={`/series/${id}/seasons/${season.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-medium">
                      Season {season.number}
                      {season.title ? `: ${season.title}` : ""}
                    </p>
                    <p className="truncate text-sm text-neutral-500">
                      {activeCount} episode{activeCount === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Series details</h2>
        <SeriesMetaForm
          seriesId={id}
          initial={{
            title: series.title,
            format: series.format,
            premise: series.premise,
          }}
        />
      </section>
    </div>
  );
}
