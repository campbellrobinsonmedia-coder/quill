import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { templateLabel } from "@/lib/format-templates";
import { ProjectTabNav } from "@/components/project-tab-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const season = project.seasonId
    ? await prisma.season.findUnique({
        where: { id: project.seasonId },
        include: {
          series: { select: { id: true, title: true } },
          episodes: {
            orderBy: { episodeNumber: "asc" },
            select: { id: true, title: true, episodeNumber: true },
          },
        },
      })
    : null;

  const episodeIndex = season?.episodes.findIndex((e) => e.id === id) ?? -1;
  const prevEpisode =
    season && episodeIndex > 0 ? season.episodes[episodeIndex - 1] : null;
  const nextEpisode =
    season && episodeIndex >= 0 && episodeIndex < season.episodes.length - 1
      ? season.episodes[episodeIndex + 1]
      : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="px-6 py-4">
        {season && (
          <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
            <Link
              href={`/series/${season.series.id}`}
              className="hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {season.series.title}
            </Link>
            <span>/</span>
            <Link
              href={`/series/${season.series.id}/seasons/${season.id}`}
              className="hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Season {season.number}
            </Link>
            <span>/</span>
            <span>Episode {project.episodeNumber}</span>
            <span className="mx-1">·</span>
            {prevEpisode ? (
              <Link
                href={`/projects/${prevEpisode.id}`}
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                ← Ep {prevEpisode.episodeNumber}
              </Link>
            ) : (
              <span className="opacity-40">← Ep</span>
            )}
            {nextEpisode ? (
              <Link
                href={`/projects/${nextEpisode.id}`}
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Ep {nextEpisode.episodeNumber} →
              </Link>
            ) : (
              <span className="opacity-40">Ep →</span>
            )}
          </div>
        )}
        <p className="text-xs text-neutral-500">
          {templateLabel(project.formatTemplate)}
        </p>
        <h1 className="text-xl font-semibold">{project.title}</h1>
        {project.logline && (
          <p className="mt-1 text-sm text-neutral-500">{project.logline}</p>
        )}
      </div>
      <ProjectTabNav projectId={id} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
