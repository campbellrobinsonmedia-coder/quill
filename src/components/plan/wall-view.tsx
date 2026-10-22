"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { OutlineCard, type OutlineCardData } from "@/components/outline-card";
import type { CardStat } from "@/lib/plan-progress";

export type WallSize = "s" | "m" | "l";
export const WALL_SIZES: { id: WallSize; label: string; min: number }[] = [
  { id: "s", label: "S", min: 170 },
  { id: "m", label: "M", min: 230 },
  { id: "l", label: "L", min: 320 },
];

// Every card in story order as one grid — the corkboard. Dropping a card on
// another puts it in that card's place (and beat).
export function WallView({
  projectId,
  orderedIds,
  cardsById,
  beatTitleOf,
  numbers,
  sceneLabelOf,
  isOrphaned,
  statOf,
  matches,
  openCardId,
  size,
  onOpen,
  onMove,
  onAdd,
}: {
  projectId: string;
  orderedIds: string[];
  cardsById: Map<string, OutlineCardData>;
  beatTitleOf: (cardId: string) => string | undefined;
  numbers: Map<string, number>;
  sceneLabelOf: (card: OutlineCardData) => string | undefined;
  isOrphaned: (cardId: string) => boolean;
  statOf: (cardId: string) => CardStat | undefined;
  matches: (card: OutlineCardData) => boolean;
  openCardId: string | null;
  size: WallSize;
  onOpen: (id: string) => void;
  onMove: (activeId: string, overId: string) => void;
  onAdd: (title: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const min = WALL_SIZES.find((s) => s.id === size)?.min ?? 230;
  const active = activeId ? cardsById.get(activeId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (e.over && e.active.id !== e.over.id) onMove(String(e.active.id), String(e.over.id));
  }

  return (
    <DndContext
      id={`plan-wall-${projectId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div
          className="grid gap-3 pb-4"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${min}px), 1fr))` }}
        >
          {orderedIds.map((id) => {
            const card = cardsById.get(id);
            if (!card) return null;
            return (
              <OutlineCard
                key={id}
                card={card}
                number={numbers.get(id) ?? 0}
                projectId={projectId}
                sceneLabel={sceneLabelOf(card)}
                sceneMissing={isOrphaned(id)}
                active={openCardId === id}
                dimmed={!matches(card)}
                beatTitle={beatTitleOf(id)}
                stat={statOf(id)}
                onOpen={() => onOpen(id)}
              />
            );
          })}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = title.trim();
              if (!t) return;
              setTitle("");
              onAdd(t);
            }}
            className="flex min-h-24 items-center rounded-md border border-dashed border-neutral-300 p-3 dark:border-neutral-700"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="+ New scene card"
              aria-label="Add a scene card"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </form>
        </div>
      </SortableContext>
      {orderedIds.length === 0 && (
        <p className="text-sm text-neutral-500">
          No scene cards yet — add one above, or switch to the Board to start from a beat template.
        </p>
      )}
      <DragOverlay>
        {active ? (
          <div className="rounded-md border border-neutral-300 bg-white p-3 text-sm font-medium shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {active.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
