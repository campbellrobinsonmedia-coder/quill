"use client";

import { useState, useTransition } from "react";
import { createSeriesIdea } from "@/app/actions/ideas";

type SeasonWithEpisodes = {
  id: string;
  number: number;
  title: string | null;
  episodes: { id: string; title: string; episodeNumber: number | null }[];
};

export function NewSeriesIdeaForm({
  seriesId,
  seasons,
}: {
  seriesId: string;
  seasons: SeasonWithEpisodes[];
}) {
  const [content, setContent] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedSeason = seasons.find((s) => s.id === seasonId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createSeriesIdea(seriesId, trimmed, {
        seasonId: seasonId || null,
        projectId: projectId || null,
      });
      setContent("");
      setSeasonId("");
      setProjectId("");
    });
  }

  const selectClass =
    "rounded-md border border-neutral-300 bg-transparent px-2 py-2 text-sm outline-none dark:border-neutral-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Quick-add an idea for this series…"
        rows={2}
        className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={seasonId}
          onChange={(e) => {
            setSeasonId(e.target.value);
            setProjectId("");
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
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
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
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          Add
        </button>
      </div>
    </form>
  );
}
