"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/toast";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateBeat, deleteBeat } from "@/app/actions/beats";
import { ReferenceList, type ReferenceData } from "@/components/reference-list";

export type BeatData = {
  id: string;
  title: string;
  summary: string | null;
  projectId: string | null;
  references?: ReferenceData[];
  /** Season arc beats: how far the assigned episode has got. */
  coverage?: { label: string; tone: "muted" | "amber" | "blue" | "emerald" };
};

const COVERAGE_TONE = {
  muted: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
} as const;

export function BeatCard({
  beat,
  number,
  episodeOptions,
}: {
  beat: BeatData;
  number: number;
  /** Season-scoped beats only: episodes this beat can be assigned to. */
  episodeOptions?: { id: string; title: string; episodeNumber: number | null }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: beat.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(beat.title);
  const [summary, setSummary] = useState(beat.summary ?? "");
  const [projectId, setProjectId] = useState(beat.projectId ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const linkedEpisode = episodeOptions?.find((e) => e.id === beat.projectId);

  function save() {
    startTransition(async () => {
      await updateBeat(beat.id, {
        title: title.trim() || "Untitled",
        summary,
        ...(episodeOptions ? { projectId: projectId || null } : {}),
      });
      setEditing(false);
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex w-full flex-col gap-2 rounded-md sm:w-64 border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="mt-1.5 shrink-0 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
          {number}
        </span>
        <div
          {...attributes}
          {...listeners}
          className="flex shrink-0 touch-none select-none items-center justify-center rounded p-2.5 cursor-grab sm:p-1.5 active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Episode {linkedEpisode.episodeNumber}: {linkedEpisode.title}
              </p>
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
          {beat.coverage && (
            <span
              className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-medium ${COVERAGE_TONE[beat.coverage.tone]}`}
            >
              {beat.coverage.label}
            </span>
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
          <div className="flex justify-between gap-2 pt-1">
            <button
              onClick={() => {
                if (!window.confirm("Delete this beat?")) return;
                startTransition(async () => {
                  try {
                    await deleteBeat(beat.id);
                    toast.success("Beat deleted");
                  } catch {
                    toast.error("Couldn't delete — try again");
                  }
                });
              }}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-600"
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
