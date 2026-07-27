"use client";

import { useEffect, useState, useTransition } from "react";
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
import { OutlineCard, type OutlineCardData } from "@/components/outline-card";
import { createCard, reorderCards } from "@/app/actions/outline";

export function OutlineBoard({
  projectId,
  initialCards,
  availableCharacters,
}: {
  projectId: string;
  initialCards: OutlineCardData[];
  availableCharacters: { id: string; name: string }[];
}) {
  const [cards, setCards] = useState(initialCards);
  useEffect(() => setCards(initialCards), [initialCards]);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();
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
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
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
          <p className="shrink-0 text-xs text-neutral-400">
            {cards.length} card{cards.length === 1 ? "" : "s"} · left to right is story order · drag to reorder
          </p>
          <DndContext
            id={`outline-board-${projectId}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cards.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex flex-1 items-start gap-0 overflow-x-auto pb-4">
                {cards.map((card, index) => (
                  <div key={card.id} className="flex shrink-0 items-center">
                    <OutlineCard
                      card={card}
                      number={index + 1}
                      availableCharacters={availableCharacters}
                    />
                    {index < cards.length - 1 && (
                      <span className="mx-2 shrink-0 text-neutral-300 dark:text-neutral-700">
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
