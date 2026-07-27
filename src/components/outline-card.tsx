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
  location: string | null;
  emotion: string | null;
  storyThread: string | null;
  characters: { id: string; name: string }[];
};

export function OutlineCard({
  card,
  number,
  availableCharacters,
}: {
  card: OutlineCardData;
  number: number;
  availableCharacters: { id: string; name: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary ?? "");
  const [act, setAct] = useState(card.act ?? "");
  const [location, setLocation] = useState(card.location ?? "");
  const [emotion, setEmotion] = useState(card.emotion ?? "");
  const [storyThread, setStoryThread] = useState(card.storyThread ?? "");
  const [colorTag, setColorTag] = useState(card.colorTag ?? "neutral");
  const [characterIds, setCharacterIds] = useState(
    new Set(card.characters.map((c) => c.id))
  );
  const [isPending, startTransition] = useTransition();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function toggleCharacter(id: string) {
    setCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateCard(card.id, {
        title: title.trim() || "Untitled",
        summary,
        act: act || null,
        location: location || null,
        emotion: emotion || null,
        storyThread: storyThread || null,
        colorTag,
        characterIds: Array.from(characterIds),
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
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: swatchFor(colorTag) }}
          />
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-medium">{card.title}</p>
            {(card.act || card.storyThread) && (
              <p className="text-xs text-neutral-400">
                {[card.act, card.storyThread && `Thread ${card.storyThread}`]
                  .filter(Boolean)
                  .join(" · ")}
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
          {card.summary && (
            <p className="whitespace-pre-wrap text-xs text-neutral-500 line-clamp-4">
              {card.summary}
            </p>
          )}
          {(card.location || card.emotion) && (
            <p className="text-xs text-neutral-400">
              {[card.location, card.emotion].filter(Boolean).join(" · ")}
            </p>
          )}
          {card.characters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.characters.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Beat summary…"
            rows={3}
            className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="flex gap-2">
            <input
              value={act}
              onChange={(e) => setAct(e.target.value)}
              placeholder="Act (e.g. Act 2)"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              value={storyThread}
              onChange={(e) => setStoryThread(e.target.value)}
              placeholder="Storyline (A/B/C)"
              list="story-thread-suggestions"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
            <datalist id="story-thread-suggestions">
              <option value="A" />
              <option value="B" />
              <option value="C" />
            </datalist>
          </div>
          <div className="flex gap-2">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder="Emotion"
              className="w-1/2 rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {availableCharacters.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-neutral-500">
                Characters in scene
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableCharacters.map((c) => {
                  const selected = characterIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCharacter(c.id)}
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        selected
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
