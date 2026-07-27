import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NewSeriesForm } from "./new-series-form";

export default async function SeriesListPage() {
  const userId = await requireUserId();
  const series = await prisma.series.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      seasons: {
        select: { _count: { select: { episodes: true } } },
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-10 p-6">
      <section className="space-y-4">
        <h1 className="text-lg font-semibold">New series</h1>
        <NewSeriesForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Series ({series.length})
        </h2>
        {series.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No series yet — start one above to organize seasons and episodes.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {series.map((s) => {
              const episodeCount = s.seasons.reduce(
                (sum, season) => sum + season._count.episodes,
                0
              );
              return (
                <li key={s.id} className="flex items-center justify-between gap-4 p-4">
                  <Link href={`/series/${s.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="truncate text-sm text-neutral-500">
                      {s.seasons.length} season{s.seasons.length === 1 ? "" : "s"} ·{" "}
                      {episodeCount} episode{episodeCount === 1 ? "" : "s"}
                      {s.premise ? ` · ${s.premise}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
