"use client";

import { useState, useTransition } from "react";
import { updateWorldNote, deleteWorldNote } from "@/app/actions/world-notes";
import { ReferenceList, type ReferenceData } from "@/components/reference-list";

export type WorldNoteData = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  references?: ReferenceData[];
};

const CATEGORY_SUGGESTIONS = ["Location", "Object", "Lore", "Rule", "Faction"];

export function WorldNoteItem({ note }: { note: WorldNoteData }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category ?? "");
  const [description, setDescription] = useState(note.description ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateWorldNote(note.id, {
        title: title.trim() || "Untitled",
        category: category || null,
        description,
      });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium">{note.title}</h3>
            {note.category && (
              <p className="text-xs text-neutral-400">{note.category}</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Edit
          </button>
        </div>
        {note.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {note.description}
          </p>
        )}
        <div className="mt-3 border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <ReferenceList
            scope={{ worldNoteId: note.id }}
            initialReferences={note.references ?? []}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-medium outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (e.g. Location)"
        list="world-note-categories"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <datalist id="world-note-categories">
        {CATEGORY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={4}
        className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex justify-between pt-1">
        <button
          onClick={() =>
            startTransition(async () => {
              await deleteWorldNote(note.id);
            })
          }
          className="text-xs text-neutral-400 hover:text-red-600"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="text-xs text-neutral-500">
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
  );
}
