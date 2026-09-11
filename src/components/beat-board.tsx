"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BeatCard, type BeatData } from "@/components/beat-card";
import {
  createSeriesBeat,
  createSeasonBeat,
  createProjectBeat,
  reorderBeats,
} from "@/app/actions/beats";

type Scope =
  | { seriesId: string }
  | { seasonId: string }
  | { projectId: string };

export function BeatBoard({
  scope,
  initialBeats,
  episodeOptions,
  cardOptions,
  placeholder = "New beat…",
  emptyMessage = "No beats yet.",
}: {
  scope: Scope;
  initialBeats: BeatData[];
  episodeOptions?: { id: string; title: string; episodeNumber: number | null }[];
  cardOptions?: { id: string; title: string }[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [beats, setBeats] = useState(initialBeats);
  const [prevInitialBeats, setPrevInitialBeats] = useState(initialBeats);
  if (initialBeats !== prevInitialBeats) {
    setPrevInitialBeats(initialBeats);
    setBeats(initialBeats);
  }
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const scopeKey =
    "seriesId" in scope
      ? `series-${scope.seriesId}`
      : "seasonId" in scope
        ? `season-${scope.seasonId}`
        : `project-${scope.projectId}`;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = beats.findIndex((b) => b.id === active.id);
    const newIndex = beats.findIndex((b) => b.id === over.id);
    const next = arrayMove(beats, oldIndex, newIndex);
    setBeats(next);
    startTransition(async () => {
      await reorderBeats(scope, next.map((b) => b.id));
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    startTransition(async () => {
      if ("seriesId" in scope) await createSeriesBeat(scope.seriesId, title);
      else if ("seasonId" in scope) await createSeasonBeat(scope.seasonId, title);
      else await createProjectBeat(scope.projectId, title);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={placeholder}
          className="flex-1 max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          Add beat
        </button>
      </form>

      {beats.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <DndContext
          id={`beats-${scopeKey}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={beats.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-start gap-3 overflow-x-auto pb-4">
              {beats.map((beat, index) => (
                <BeatCard
                  key={beat.id}
                  beat={beat}
                  number={index + 1}
                  episodeOptions={episodeOptions}
                  cardOptions={cardOptions}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
