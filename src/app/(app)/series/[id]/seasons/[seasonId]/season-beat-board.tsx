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
import { SeasonBeatCard, type SeasonBeatData } from "./season-beat-card";
import { createSeasonBeat, reorderSeasonBeats } from "@/app/actions/season-beats";

export function SeasonBeatBoard({
  seasonId,
  initialBeats,
  episodes,
}: {
  seasonId: string;
  initialBeats: SeasonBeatData[];
  episodes: { id: string; title: string; episodeNumber: number | null }[];
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = beats.findIndex((b) => b.id === active.id);
    const newIndex = beats.findIndex((b) => b.id === over.id);
    const next = arrayMove(beats, oldIndex, newIndex);
    setBeats(next);
    startTransition(async () => {
      await reorderSeasonBeats(seasonId, next.map((b) => b.id));
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    startTransition(async () => {
      await createSeasonBeat(seasonId, title);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New season beat (e.g. Midpoint reveal)…"
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
        <p className="text-sm text-neutral-500">
          No season-level beats yet — sketch the season&apos;s shape here
          before breaking it into episodes.
        </p>
      ) : (
        <DndContext
          id={`season-beats-${seasonId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={beats.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex items-start gap-3 overflow-x-auto pb-4">
              {beats.map((beat, index) => (
                <SeasonBeatCard
                  key={beat.id}
                  beat={beat}
                  number={index + 1}
                  episodes={episodes}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
