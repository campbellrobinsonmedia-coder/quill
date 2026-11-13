"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { swatchFor } from "@/lib/outline-colors";
import { cardHeading, initials, splitCharacters } from "@/lib/card-face";
import { updateCard } from "@/app/actions/outline";
import { useToast } from "@/components/toast";
import { STATUS_LABELS, type CardStat } from "@/lib/plan-progress";

export type OutlineCardData = {
  id: string;
  title: string;
  summary: string | null;
  turn: string | null;
  status: string;
  parked: boolean;
  gap: boolean;
  colorTag: string | null;
  act: string | null;
  location: string | null;
  emotion: string | null;
  storyThread: string | null;
  linkedSceneId: string | null;
  beatId: string | null;
  characters: { id: string; name: string }[];
};

// What a scene card looks like on the Plan board: everything you need to judge
// the scene at a glance. Editing happens in the side panel (card-editor.tsx);
// clicking the card opens it, and the dot is the drag handle.
export function OutlineCard({
  card,
  number,
  projectId,
  sceneLabel,
  sceneMissing = false,
  active = false,
  dimmed = false,
  beatTitle,
  stat,
  onOpen,
}: {
  card: OutlineCardData;
  number: number;
  projectId: string;
  /** Label of the script scene this card is linked to, e.g. "3. INT. ATTIC - DAY". */
  sceneLabel?: string;
  /** The linked scene no longer exists in the script. */
  sceneMissing?: boolean;
  active?: boolean;
  /** Another card is being highlighted; fade this one. */
  dimmed?: boolean;
  /** Shown on the face when cards from different beats sit together (the Wall). */
  beatTitle?: string;
  /** Progress read from the script: status and the linked scene's pages. */
  stat?: CardStat;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

  const toast = useToast();
  const [asidePending, startAside] = useTransition();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : dimmed ? 0.3 : card.parked ? 0.55 : 1,
  };

  // Greys the scene out (or brings it back), or marks a gap as filled, without
  // opening the panel.
  function toggleAside() {
    startAside(async () => {
      try {
        await updateCard(card.id, card.gap ? { gap: false } : { parked: !card.parked });
      } catch {
        toast.error("Couldn't update the scene — try again");
      }
    });
  }

  const heading = cardHeading({ sceneLabel: sceneMissing ? null : sceneLabel, location: card.location });
  const { shown, extra } = splitCharacters(card.characters, 4);
  const blank = !card.summary && !card.turn;
  const showStatus = stat && stat.status !== "idea";
  const showPages = !!stat?.pages && !sceneMissing;

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Scene card ${number}: ${card.title}. Open to edit.`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group flex w-full cursor-pointer flex-col gap-1.5 rounded-md border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md dark:bg-neutral-900 ${
        card.gap ? "border-dashed border-amber-400 dark:border-amber-600" : card.parked ? "border-dashed" : ""
      } ${
        active
          ? "border-neutral-900 ring-1 ring-neutral-900 dark:border-white dark:ring-white"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
          {card.gap ? "?" : card.parked ? "–" : number}
        </span>
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="-my-1 flex shrink-0 cursor-grab touch-none select-none items-center justify-center rounded p-2.5 hover:bg-neutral-100 active:cursor-grabbing sm:p-1.5 dark:hover:bg-neutral-800"
          title="Drag to reorder"
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: swatchFor(card.colorTag) }}
          />
        </div>
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {heading ?? ""}
        </p>
        {card.storyThread && (
          <span
            title={`Storyline: ${card.storyThread}`}
            className="max-w-24 shrink-0 truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {card.storyThread}
          </span>
        )}
        <button
          type="button"
          disabled={asidePending}
          onClick={(e) => {
            e.stopPropagation();
            toggleAside();
          }}
          title={
            card.gap
              ? "Mark as filled: make it a normal scene"
              : card.parked
                ? "Bring this scene back"
                : "Set aside: grey it out without deleting it"
          }
          className={`shrink-0 rounded px-1 py-0.5 text-[10px] text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-60 dark:hover:text-neutral-100 ${
            card.parked || card.gap
              ? ""
              : "sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          }`}
        >
          {card.gap ? "Mark filled" : card.parked ? "Bring back" : "Set aside"}
        </button>
      </div>

      {beatTitle && (
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          {beatTitle}
        </p>
      )}
      {card.gap && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Gap to fill
        </p>
      )}
      <p className={`text-sm font-medium leading-snug ${card.parked ? "line-through decoration-neutral-400" : ""}`}>
        {card.title}
      </p>

      {card.summary && (
        <p className="line-clamp-3 whitespace-pre-wrap text-xs text-neutral-600 dark:text-neutral-400">
          {card.summary}
        </p>
      )}
      {card.turn && (
        <p className="line-clamp-2 text-xs italic text-neutral-500 dark:text-neutral-400">
          <span aria-hidden>↳ </span>
          {card.turn}
        </p>
      )}
      {blank && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Open to add what happens and the turn
        </p>
      )}

      {(shown.length > 0 || card.linkedSceneId || card.emotion || showStatus || showPages) && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {shown.map((c) => (
            <span
              key={c.id}
              title={c.name}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {initials(c.name)}
            </span>
          ))}
          {extra > 0 && <span className="text-[10px] text-neutral-500">+{extra}</span>}
          {card.emotion && (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{card.emotion}</span>
          )}
          {stat && showStatus && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                stat.status === "written"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {STATUS_LABELS[stat.status]}
            </span>
          )}
          {showPages && (
            <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {stat?.pages} pp
            </span>
          )}
          {card.linkedSceneId && !sceneMissing && (
            <Link
              href={`/projects/${projectId}/write?scene=${card.linkedSceneId}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-[11px] text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              → scene
            </Link>
          )}
          {card.linkedSceneId && sceneMissing && (
            <span className="ml-auto text-[11px] text-amber-700 dark:text-amber-400">
              scene removed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
