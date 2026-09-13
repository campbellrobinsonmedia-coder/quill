"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateBeat, deleteBeat } from "@/app/actions/beats";
import { ReferenceList, type ReferenceData } from "@/components/reference-list";

export type BeatData = {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  linkedCardId: string | null;
  references?: ReferenceData[];
};

export function BeatCard({
  beat,
  number,
  episodeOptions,
  cardOptions,
}: {
  beat: BeatData;
  number: number;
  /** Season-scoped beats only: episodes this beat can be assigned to. */
  episodeOptions?: { id: string; title: string; episodeNumber: number | null }[];
  /** Project-scoped beats only: outline cards this beat can link to once broken down. */
  cardOptions?: { id: string; title: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: beat.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(beat.title);
  const [summary, setSummary] = useState(beat.summary ?? "");
  const [projectId, setProjectId] = useState(beat.projectId ?? "");
  const [linkedCardId, setLinkedCardId] = useState(beat.linkedCardId ?? "");
  const [isPending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const linkedEpisode = episodeOptions?.find((e) => e.id === beat.projectId);
  const linkedCard = cardOptions?.find((c) => c.id === beat.linkedCardId);

  function save() {
    startTransition(async () => {
      await updateBeat(beat.id, {
        title: title.trim() || "Untitled",
        summary,
        ...(episodeOptions ? { projectId: projectId || null } : {}),
        linkedCardId: linkedCardId || null,
      });
      setEditing(false);
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-64 flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="mt-1.5 shrink-0 text-xs font-medium tabular-nums text-neutral-400">
          {number}
        </span>
        <div
          {...attributes}
          {...listeners}
          className="flex shrink-0 touch-none select-none items-center justify-center rounded p-1.5 cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="Drag to reorder"
        >
          <div className="h-3 w-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-medium">{beat.title}</p>
            {linkedEpisode && (
              <p className="text-xs text-neutral-400">
                Episode {linkedEpisode.episodeNumber}: {linkedEpisode.title}
              </p>
            )}
            {linkedCard && (
              <p className="text-xs text-neutral-400">→ {linkedCard.title}</p>
            )}
          </button>
        ) : (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
      </div>

      {!editing ? (
        <>
          {beat.summary && (
            <p className="whitespace-pre-wrap text-xs text-neutral-500 line-clamp-4">
              {beat.summary}
            </p>
          )}
          <ReferenceList
            scope={{ beatId: beat.id }}
            initialReferences={beat.references ?? []}
          />
        </>
      ) : (
        <div className="space-y-2">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What happens in this beat…"
            rows={3}
            className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          {episodeOptions && episodeOptions.length > 0 && (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Not assigned to an episode</option>
              {episodeOptions.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  Episode {ep.episodeNumber}: {ep.title}
                </option>
              ))}
            </select>
          )}
          {cardOptions && cardOptions.length > 0 && (
            <select
              value={linkedCardId}
              onChange={(e) => setLinkedCardId(e.target.value)}
              className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Not broken into a card yet</option>
              {cardOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-between gap-2 pt-1">
            <button
              onClick={() =>
                startTransition(async () => {
                  await deleteBeat(beat.id);
                })
              }
              className="text-xs text-neutral-400 hover:text-red-600"
            >
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-neutral-500"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isPending}
                className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
