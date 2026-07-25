"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateCard, deleteCard } from "@/app/actions/outline";
import { OUTLINE_COLORS, swatchFor } from "@/lib/outline-colors";

export type OutlineCardData = {
  id: string;
  title: string;
  summary: string | null;
  colorTag: string | null;
  act: string | null;
};

export function OutlineCard({ card }: { card: OutlineCardData }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary ?? "");
  const [act, setAct] = useState(card.act ?? "");
  const [colorTag, setColorTag] = useState(card.colorTag ?? "neutral");
  const [isPending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function save() {
    startTransition(async () => {
      await updateCard(card.id, {
        title: title.trim() || "Untitled",
        summary,
        act: act || null,
        colorTag,
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
        <div
          {...attributes}
          {...listeners}
          className="mt-1 h-3 w-3 shrink-0 cursor-grab rounded-full active:cursor-grabbing"
          style={{ backgroundColor: swatchFor(colorTag) }}
          title="Drag to reorder"
        />
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-medium">{card.title}</p>
            {card.act && (
              <p className="text-xs text-neutral-400">{card.act}</p>
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
        card.summary && (
          <p className="whitespace-pre-wrap text-xs text-neutral-500 line-clamp-4">
            {card.summary}
          </p>
        )
      ) : (
        <div className="space-y-2">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Beat summary…"
            rows={3}
            className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            value={act}
            onChange={(e) => setAct(e.target.value)}
            placeholder="Act / thread (e.g. Act 2)"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="flex flex-wrap gap-1.5">
            {OUTLINE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                onClick={() => setColorTag(c.id)}
                className={`h-5 w-5 rounded-full ${
                  colorTag === c.id ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white" : ""
                }`}
                style={{ backgroundColor: c.swatch }}
              />
            ))}
          </div>
          <div className="flex justify-between gap-2 pt-1">
            <button
              onClick={() =>
                startTransition(async () => {
                  await deleteCard(card.id);
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
