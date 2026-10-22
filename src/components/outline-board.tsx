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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMediaQuery } from "@/lib/use-media-query";
import { OutlineCard, type OutlineCardData } from "@/components/outline-card";
import { createCard, reorderCards } from "@/app/actions/outline";

export function OutlineBoard({
  projectId,
  initialCards,
  availableCharacters,
  availableScenes = [],
}: {
  projectId: string;
  initialCards: OutlineCardData[];
  availableCharacters: { id: string; name: string }[];
  availableScenes?: { id: string; label: string }[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [prevInitialCards, setPrevInitialCards] = useState(initialCards);
  if (initialCards !== prevInitialCards) {
    setPrevInitialCards(initialCards);
    setCards(initialCards);
  }
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const stacked = useMediaQuery("(max-width: 639px)");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    const next = arrayMove(cards, oldIndex, newIndex);
    setCards(next);
    startTransition(async () => {
      await reorderCards(projectId, next.map((c) => c.id));
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    startTransition(async () => {
      await createCard(projectId, title);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:overflow-hidden sm:p-6">
      <form onSubmit={handleAdd} className="flex shrink-0 gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New scene / beat…"
          className="flex-1 max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          Add card
        </button>
      </form>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No cards yet — add your first scene or beat above.
        </p>
      ) : (
        <>
          <p className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
            {cards.length} card{cards.length === 1 ? "" : "s"} · {stacked ? "top to bottom" : "left to right"} is story order · drag to reorder
          </p>
          <DndContext
            id={`outline-board-${projectId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cards.map((c) => c.id)} strategy={stacked ? verticalListSortingStrategy : horizontalListSortingStrategy}>
              <div className="flex flex-1 flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:gap-0 sm:overflow-x-auto">
                {cards.map((card, index) => (
                  <div key={card.id} className="flex w-full shrink-0 items-center sm:w-auto">
                    <OutlineCard
                      card={card}
                      number={index + 1}
                      projectId={projectId}
                      availableCharacters={availableCharacters}
                      availableScenes={availableScenes}
                    />
                    {index < cards.length - 1 && (
                      <span className="mx-2 hidden shrink-0 text-neutral-300 sm:inline dark:text-neutral-700">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
