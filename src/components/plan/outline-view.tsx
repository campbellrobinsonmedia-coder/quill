"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { updateCard } from "@/app/actions/outline";
import { useToast } from "@/components/toast";
import type { OutlineCardData } from "@/components/outline-card";
import { cardHeading } from "@/lib/card-face";
import { swatchFor } from "@/lib/outline-colors";

type Group = { key: string; label: string; summary: string | null; ids: string[] };

function GrowTextarea({
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  className: string;
  placeholder: string;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`block w-full resize-none overflow-hidden rounded bg-transparent px-1 py-0.5 outline-none hover:bg-neutral-50 focus:bg-neutral-50 focus:ring-1 focus:ring-neutral-300 dark:hover:bg-neutral-900 dark:focus:bg-neutral-900 dark:focus:ring-neutral-700 ${className}`}
    />
  );
}

// One scene as a line of the outline. Title, what happens and the turn edit in
// place and save when you click away.
function OutlineRow({
  card,
  number,
  sceneLabel,
  sceneMissing,
  dimmed,
  active,
  onOpen,
}: {
  card: OutlineCardData;
  number: number;
  sceneLabel?: string;
  sceneMissing: boolean;
  dimmed: boolean;
  active: boolean;
  onOpen: () => void;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary ?? "");
  const [turn, setTurn] = useState(card.turn ?? "");

  function save() {
    const next = { title: title.trim() || card.title, summary: summary.trim(), turn: turn.trim() };
    if (
      next.title === card.title &&
      next.summary === (card.summary ?? "") &&
      next.turn === (card.turn ?? "")
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await updateCard(card.id, { title: next.title, summary: next.summary, turn: next.turn || null });
      } catch {
        toast.error("Couldn't save that change — try again");
      }
    });
  }

  const heading = cardHeading({ sceneLabel: sceneMissing ? null : sceneLabel, location: card.location });

  return (
    <li
      className={`flex gap-3 py-3 transition-opacity ${dimmed ? "opacity-30" : ""} ${
        active ? "bg-neutral-50 dark:bg-neutral-900" : ""
      }`}
    >
      <div className="flex w-8 shrink-0 flex-col items-end gap-1.5 pt-1.5">
        <span className="text-xs font-medium tabular-nums text-neutral-500">{number}</span>
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: swatchFor(card.colorTag) }} />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        {heading && (
          <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {heading}
            {card.storyThread && <span className="ml-2 rounded bg-neutral-100 px-1 text-[10px] dark:bg-neutral-800">{card.storyThread}</span>}
          </p>
        )}
        <GrowTextarea
          value={title}
          onChange={setTitle}
          onBlur={save}
          label={`Scene ${number} title`}
          placeholder="Title"
          className="text-sm font-medium"
        />
        <GrowTextarea
          value={summary}
          onChange={setSummary}
          onBlur={save}
          label={`Scene ${number}: what happens`}
          placeholder="What happens…"
          className="text-sm text-neutral-700 dark:text-neutral-300"
        />
        <div className="flex items-start gap-1">
          <span aria-hidden className="pl-1 pt-0.5 text-sm italic text-neutral-400">
            ↳
          </span>
          <GrowTextarea
            value={turn}
            onChange={setTurn}
            onBlur={save}
            label={`Scene ${number}: the turn`}
            placeholder="The turn — what changes…"
            className="text-sm italic text-neutral-600 dark:text-neutral-400"
          />
        </div>
        {card.characters.length > 0 && (
          <p className="px-1 text-xs text-neutral-500">
            {card.characters.map((c) => c.name).join(", ")}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="h-fit shrink-0 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        Details
      </button>
    </li>
  );
}

// The story as text: scenes numbered in order under their beats, each one
// editable where it stands — it reads like a treatment.
export function OutlineView({
  groups,
  cardsById,
  numbers,
  sceneLabelOf,
  isOrphaned,
  matches,
  openCardId,
  onOpen,
  onAdd,
}: {
  groups: Group[];
  cardsById: Map<string, OutlineCardData>;
  numbers: Map<string, number>;
  sceneLabelOf: (card: OutlineCardData) => string | undefined;
  isOrphaned: (cardId: string) => boolean;
  matches: (card: OutlineCardData) => boolean;
  openCardId: string | null;
  onOpen: (id: string) => void;
  onAdd: (title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const total = groups.reduce((n, g) => n + g.ids.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {groups.map((group) => (
        <section key={group.key} className="mb-6">
          <h3 className="border-b border-neutral-200 pb-1 text-sm font-semibold dark:border-neutral-800">
            {group.label}
            <span className="ml-2 text-xs font-normal text-neutral-400">{group.ids.length}</span>
          </h3>
          {group.summary && <p className="mt-1 text-xs text-neutral-500">{group.summary}</p>}
          {group.ids.length === 0 ? (
            <p className="py-2 text-xs text-neutral-500">No scenes in this beat yet.</p>
          ) : (
            <ol className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {group.ids.map((id) => {
                const card = cardsById.get(id);
                if (!card) return null;
                return (
                  <OutlineRow
                    // Re-mount when the saved values change on the server.
                    key={`${id}:${card.title}|${card.summary}|${card.turn}`}
                    card={card}
                    number={numbers.get(id) ?? 0}
                    sceneLabel={sceneLabelOf(card)}
                    sceneMissing={isOrphaned(id)}
                    dimmed={!matches(card)}
                    active={openCardId === id}
                    onOpen={() => onOpen(id)}
                  />
                );
              })}
            </ol>
          )}
        </section>
      ))}

      {total === 0 && (
        <p className="mb-4 text-sm text-neutral-500">
          No scenes yet — add the first one below.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          setTitle("");
          onAdd(t);
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ New scene"
          aria-label="Add a scene"
          className="w-full rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-transparent"
        />
      </form>
    </div>
  );
}
