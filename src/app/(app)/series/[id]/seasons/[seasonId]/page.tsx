import type { Metadata } from "next";
import Link from "next/link";
import { getSeasonOrNotFound } from "@/lib/get-series";
import { prisma } from "@/lib/prisma";
import { templateLabel } from "@/lib/format-templates";
import { NewEpisodeForm } from "./new-episode-form";
import { NewSeasonIdeaForm } from "./new-season-idea-form";
import { BeatBoard } from "@/components/beat-board";
import { ReferenceList } from "@/components/reference-list";
import { deleteIdea } from "@/app/actions/ideas";
import { DeleteButton } from "@/components/delete-button";
import { SeasonTemplateMenu } from "@/components/season/season-template-menu";
import { StatusBar, STATUS_COLORS } from "@/components/plan/status-bar";
import { STATUS_LABELS } from "@/lib/plan-progress";
import type { DraftContent } from "@/lib/draft-content";
import {
  arcCoverage,
  arcGaps,
  episodeRollup,
  seasonTotals,
  type EpisodeRollup,
} from "@/lib/season-rollup";

type EpisodeStatus = "Idea" | "Outlined" | "Drafted" | "Locked";

function deriveStatus(ep: {
  _count: { outlineCards: number };
  draft: { wordCount: number; sceneNumbersLocked: boolean } | null;
}): EpisodeStatus {
  if (ep.draft?.sceneNumbersLocked) return "Locked";
  if (ep.draft && ep.draft.wordCount > 0) return "Drafted";
  if (ep._count.outlineCards > 0) return "Outlined";
  return "Idea";
}

const STATUS_STYLE: Record<EpisodeStatus, string> = {
  Idea: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  Outlined: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Drafted: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Locked: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}): Promise<Metadata> {
  const { seasonId } = await params;
  const season = await getSeasonOrNotFound(seasonId);
  return { title: `Season ${season.number}${season.title ? `: ${season.title}` : ""}` };
}

export default async function SeasonBoardPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  const season = await getSeasonOrNotFound(seasonId);

  const [episodes, ideas, beats, references] = await Promise.all([
    prisma.project.findMany({
      where: { seasonId },
      orderBy: { episodeNumber: "asc" },
      include: {
        _count: { select: { outlineCards: true } },
        outlineCards: { select: { id: true, status: true, linkedSceneId: true, beatId: true } },
        draft: { select: { wordCount: true, sceneNumbersLocked: true, content: true } },
      },
    }),
    prisma.idea.findMany({
      where: { seasonId },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { title: true, episodeNumber: true } } },
    }),
    prisma.beat.findMany({
      where: { seasonId },
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
      where: { seasonId },
      orderBy: { createdAt: "asc" },
      select: { id: true, kind: true, url: true, label: true, note: true, fileType: true },
    }),
  ]);

  const episodeOptions = episodes.map((ep) => ({
    id: ep.id,
    title: ep.episodeTitle || ep.title,
    episodeNumber: ep.episodeNumber,
  }));

  const rollups = new Map<string, EpisodeRollup>(
    episodes.map((ep) => [
      ep.id,
      episodeRollup({
        formatTemplate: ep.formatTemplate,
        pageTarget: ep.pageTarget,
        cards: ep.outlineCards,
        draftContent: ep.draft ? (ep.draft.content as unknown as DraftContent) : null,
      }),
    ])
  );
  const totals = seasonTotals(Array.from(rollups.values()));
  const gaps = arcGaps(beats, episodes);
  const beatsWithCoverage = beats.map((b) => ({ ...b, coverage: arcCoverage(b, rollups) }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={`/series/${id}`} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          ← {season.series.title}
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Season {season.number}
            {season.title ? `: ${season.title}` : ""}
          </h2>
          <p className="text-sm text-neutral-500">
            {episodes.length} episode{episodes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
          <Link
            href={`/series/${id}/seasons/${seasonId}/threads`}
            className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Storylines &amp; characters
          </Link>
          <a
            href={`/api/series/${id}/seasons/${seasonId}/export/pitch`}
            className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Export pitch (PDF)
          </a>
          {totals.scenes > 0 && (
            <>
              <a
                href={`/api/series/${id}/seasons/${seasonId}/export/outline?kind=cards`}
                download
                className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Print index cards (PDF)
              </a>
              <a
                href={`/api/series/${id}/seasons/${seasonId}/export/outline?kind=outline`}
                download
                className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                Print outlines (PDF)
              </a>
            </>
          )}
        </div>
      </div>

      {totals.scenes > 0 && (
        <section
          aria-label="Season progress"
          className="space-y-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
        >
          <p>
            <span className="font-medium tabular-nums">{totals.written}</span>
            <span className="text-neutral-500">
              {" "}
              of {totals.scenes} scenes written across {totals.episodes} episode
              {totals.episodes === 1 ? "" : "s"}
              {totals.started > 0 && ` · ${totals.started} started`}
              {totals.target > 0 &&
                ` · ${totals.pages} of ${totals.target} pages`}
            </span>
          </p>
          <StatusBar
            counts={{ written: totals.written, started: totals.started, idea: totals.idea }}
            total={totals.scenes}
          />
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
            {(["written", "started", "idea"] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s]}`} />
                {STATUS_LABELS[s]}
              </span>
            ))}
          </p>
        </section>
      )}

      <section className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-500">Season arc</h3>
          <SeasonTemplateMenu seasonId={seasonId} />
        </div>
        <BeatBoard
          scope={{ seasonId }}
          initialBeats={beatsWithCoverage}
          episodeOptions={episodeOptions}
          placeholder="New season beat (e.g. Midpoint reveal)…"
          emptyMessage="No season-level beats yet — sketch the season's shape here before breaking it into episodes, or start from an arc template."
        />
        {(gaps.unassigned.length > 0 || gaps.episodesWithoutBeats.length > 0) && (
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
            {gaps.unassigned.length > 0 && (
              <li>
                {gaps.unassigned.length} arc beat{gaps.unassigned.length === 1 ? " isn't" : "s aren't"} assigned to an
                episode yet: {gaps.unassigned.slice(0, 4).join(", ")}
                {gaps.unassigned.length > 4 ? ` and ${gaps.unassigned.length - 4} more` : ""}.
              </li>
            )}
            {gaps.episodesWithoutBeats.length > 0 && (
              <li>
                No arc beat is assigned to episode{gaps.episodesWithoutBeats.length === 1 ? "" : "s"}{" "}
                {gaps.episodesWithoutBeats.join(", ")}.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h3 className="text-sm font-medium text-neutral-500">Moodboard</h3>
        <ReferenceList scope={{ seasonId }} initialReferences={references} />
      </section>

      <NewEpisodeForm seasonId={seasonId} />

      {episodes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No episodes yet — add your first one above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => {
            const status = deriveStatus(ep);
            const roll = rollups.get(ep.id)!;
            return (
              <Link
                key={ep.id}
                href={`/projects/${ep.id}`}
                className={`flex flex-col gap-1 rounded-md border p-4 hover:border-neutral-400 dark:hover:border-neutral-600 ${
                  ep.status === "ARCHIVED"
                    ? "border-neutral-200 opacity-50 dark:border-neutral-800"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                    Episode {ep.episodeNumber}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="truncate font-medium">
                  {ep.episodeTitle || ep.title}
                </p>
                {ep.logline && (
                  <p className="line-clamp-2 text-sm text-neutral-500">{ep.logline}</p>
                )}
                {roll.total > 0 && (
                  <div className="mt-1 space-y-1">
                    <StatusBar counts={roll.counts} total={roll.total} />
                    <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {roll.counts.written}/{roll.total} scenes written
                      {roll.scriptPages !== null &&
                        ` · ${roll.scriptPages}${roll.target ? ` of ${roll.target}` : ""} pp`}
                    </p>
                  </div>
                )}
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {templateLabel(ep.formatTemplate)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <section className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-500">
            Ideas for this season ({ideas.length})
          </h3>
          <Link
            href={`/series/${id}/ideas`}
            className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            All series ideas
          </Link>
        </div>
        <NewSeasonIdeaForm seriesId={id} seasonId={seasonId} />
        {ideas.length > 0 && (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex items-start justify-between gap-4 p-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm">{idea.content}</p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {idea.project
                      ? `Episode ${idea.project.episodeNumber}: ${idea.project.title}`
                      : "Whole season"}
                  </p>
                </div>
                <DeleteButton
                  confirmMessage="Delete this idea?"
                  onDelete={async () => {
                    "use server";
                    await deleteIdea(idea.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
