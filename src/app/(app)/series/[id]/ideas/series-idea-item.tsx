"use client";

import { useState, useTransition } from "react";
import { deleteIdea, updateIdeaScope } from "@/app/actions/ideas";

type SeasonWithEpisodes = {
  id: string;
  number: number;
  title: string | null;
  episodes: { id: string; title: string; episodeNumber: number | null }[];
};

export function SeriesIdeaItem({
  id,
  content,
  createdAt,
  seasonId,
  projectId,
  seasons,
}: {
  id: string;
  content: string;
  createdAt: string;
  seasonId: string | null;
  projectId: string | null;
  seasons: SeasonWithEpisodes[];
}) {
  const [isPending, startTransition] = useTransition();
  const [localSeasonId, setLocalSeasonId] = useState(seasonId ?? "");
  const [localProjectId, setLocalProjectId] = useState(projectId ?? "");

  const selectedSeason = seasons.find((s) => s.id === localSeasonId);

  function applyScope(nextSeasonId: string, nextProjectId: string) {
    startTransition(async () => {
      await updateIdeaScope(id, {
        seasonId: nextSeasonId || null,
        projectId: nextProjectId || null,
      });
    });
  }

  const scopeLabel = (() => {
    if (projectId) {
      const season = seasons.find((s) => s.id === seasonId);
      const ep = season?.episodes.find((e) => e.id === projectId);
      return ep ? `Episode ${ep.episodeNumber}: ${ep.title}` : "Episode";
    }
    if (seasonId) {
      const season = seasons.find((s) => s.id === seasonId);
      return season ? `Season ${season.number}${season.title ? `: ${season.title}` : ""}` : "Season";
    }
    return "General to series";
  })();

  const selectClass =
    "rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs outline-none dark:border-neutral-700";

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {createdAt} · {scopeLabel}
          </p>
        </div>
        <button
          disabled={isPending}
          onClick={() => startTransition(async () => { await deleteIdea(id); })}
          className="shrink-0 text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={localSeasonId}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.value;
            setLocalSeasonId(next);
            setLocalProjectId("");
            applyScope(next, "");
          }}
          className={selectClass}
        >
          <option value="">General to series</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              Season {s.number}
              {s.title ? `: ${s.title}` : ""}
            </option>
          ))}
        </select>
        {selectedSeason && selectedSeason.episodes.length > 0 && (
          <select
            value={localProjectId}
            disabled={isPending}
            onChange={(e) => {
              const next = e.target.value;
              setLocalProjectId(next);
              applyScope(localSeasonId, next);
            }}
            className={selectClass}
          >
            <option value="">Whole season</option>
            {selectedSeason.episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                Episode {ep.episodeNumber}: {ep.title}
              </option>
            ))}
          </select>
        )}
      </div>
    </li>
  );
}
