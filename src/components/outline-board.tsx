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
  rectSortingStrategy,
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
    <div className="flex flex-1 flex-col gap-4 p-6">
      <form onSubmit={handleAdd} className="flex gap-2">
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
        <DndContext
          id={`outline-board-${projectId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-3">
              {cards.map((card) => (
                <OutlineCard
                  key={card.id}
                  card={card}
                  availableCharacters={availableCharacters}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
