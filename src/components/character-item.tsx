"use client";

import { useState, useTransition } from "react";
import { updateCharacter, deleteCharacter } from "@/app/actions/characters";
import { ReferenceList, type ReferenceData } from "@/components/reference-list";

export type CharacterData = {
  id: string;
  name: string;
  description: string | null;
  arcNotes: string | null;
  relationships: string | null;
  references?: ReferenceData[];
};

export function CharacterItem({ character }: { character: CharacterData }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description ?? "");
  const [arcNotes, setArcNotes] = useState(character.arcNotes ?? "");
  const [relationships, setRelationships] = useState(character.relationships ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateCharacter(character.id, {
        name: name.trim() || "Unnamed",
        description,
        arcNotes,
        relationships,
      });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-medium">{character.name}</h3>
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Edit
          </button>
        </div>
        {character.description && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {character.description}
          </p>
        )}
        {character.arcNotes && (
          <p className="mt-2 text-xs text-neutral-500">
            <span className="font-medium">Arc: </span>
            {character.arcNotes}
          </p>
        )}
        {character.relationships && (
          <p className="mt-1 text-xs text-neutral-500">
            <span className="font-medium">Relationships: </span>
            {character.relationships}
          </p>
        )}
        <div className="mt-3 border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <ReferenceList
            scope={{ characterId: character.id }}
            initialReferences={character.references ?? []}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-300 p-4 dark:border-neutral-700">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-medium outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <textarea
        value={arcNotes}
        onChange={(e) => setArcNotes(e.target.value)}
        placeholder="Arc notes"
        rows={2}
        className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <textarea
        value={relationships}
        onChange={(e) => setRelationships(e.target.value)}
        placeholder="Relationships"
        rows={2}
        className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <div className="flex justify-between pt-1">
        <button
          onClick={() =>
            startTransition(async () => {
              await deleteCharacter(character.id);
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
