import Link from "next/link";
import { getSeasonOrNotFound } from "@/lib/get-series";
import { prisma } from "@/lib/prisma";
import { templateLabel } from "@/lib/format-templates";
import { NewEpisodeForm } from "./new-episode-form";

export default async function SeasonBoardPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  const season = await getSeasonOrNotFound(seasonId);

  const episodes = await prisma.project.findMany({
    where: { seasonId },
    orderBy: { episodeNumber: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/series/${id}`} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          ← {season.series.title}
        </Link>
      </div>
      <div>
        <h2 className="text-lg font-semibold">
          Season {season.number}
          {season.title ? `: ${season.title}` : ""}
        </h2>
        <p className="text-sm text-neutral-500">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"}
        </p>
      </div>

      <NewEpisodeForm seasonId={seasonId} />

      {episodes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No episodes yet — add your first one above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => (
            <Link
              key={ep.id}
              href={`/projects/${ep.id}`}
              className={`flex flex-col gap-1 rounded-md border p-4 hover:border-neutral-400 dark:hover:border-neutral-600 ${
                ep.status === "ARCHIVED"
                  ? "border-neutral-200 opacity-50 dark:border-neutral-800"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <p className="text-xs font-medium tabular-nums text-neutral-400">
                Episode {ep.episodeNumber}
              </p>
              <p className="truncate font-medium">
                {ep.episodeTitle || ep.title}
              </p>
              {ep.logline && (
                <p className="line-clamp-2 text-sm text-neutral-500">{ep.logline}</p>
              )}
              <p className="mt-1 text-xs text-neutral-400">
                {templateLabel(ep.formatTemplate)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
