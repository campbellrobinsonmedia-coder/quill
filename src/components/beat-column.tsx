"use client";

import { useState, useTransition } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateBeat, deleteBeat, setBeatArchived, setBeatGap } from "@/app/actions/beats";
import { Menu, MENU_ITEM } from "@/components/menu";
import { createCard } from "@/app/actions/outline";
import { ReferenceList, type ReferenceData } from "@/components/reference-list";
import { useToast } from "@/components/toast";

export type PlanBeat = {
  id: string;
  title: string;
  summary: string | null;
  /** A placeholder for a beat still to be worked out. */
  gap?: boolean;
  references: ReferenceData[];
};

function AddScene({
  projectId,
  beatId,
}: {
  projectId: string;
  beatId: string | null;
}) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function add(gap: boolean) {
    const title = value.trim();
    if (!title) return;
    setValue("");
    startTransition(async () => {
      try {
        await createCard(projectId, title, beatId, { gap });
      } catch {
        toast.error("Couldn't add that — try again");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add(false);
      }}
      className="flex gap-1.5 p-2 pt-0"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+ Scene"
        aria-label={beatId ? "Add a scene to this beat" : "Add a scene"}
        disabled={isPending}
        className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      {value.trim() && (
        <button
          type="button"
          onClick={() => add(true)}
          disabled={isPending}
          title="Add it as a gap: a placeholder for a scene still to be found"
          className="shrink-0 rounded border border-amber-300 px-2 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
        >
          + Gap
        </button>
      )}
    </form>
  );
}

function ColumnBody({
  columnId,
  children,
}: {
  columnId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${columnId}`,
    data: { type: "container", columnId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-14 flex-col gap-2 p-2 ${
        isOver ? "bg-neutral-100/70 dark:bg-neutral-800/50" : ""
      }`}
    >
      {children}
    </div>
  );
}

const SHELL =
  "flex w-full flex-col rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40";

export function UnplannedColumn({
  projectId,
  title,
  wide,
  count,
  children,
}: {
  projectId: string;
  title: string;
  wide: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className={`${SHELL} ${wide ? "sm:w-96" : "sm:w-72"} sm:shrink-0`}>
      <header className="flex items-center justify-between gap-2 px-3 pt-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs tabular-nums text-neutral-500">{count}</span>
      </header>
      <ColumnBody columnId="unplanned">{children}</ColumnBody>
      <AddScene projectId={projectId} beatId={null} />
    </section>
  );
}

export function BeatColumn({
  projectId,
  beat,
  count,
  children,
}: {
  projectId: string;
  beat: PlanBeat;
  count: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: beat.id, data: { type: "column" } });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(beat.title);
  const [summary, setSummary] = useState(beat.summary ?? "");
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function save() {
    startTransition(async () => {
      try {
        await updateBeat(beat.id, { title: title.trim() || "Untitled", summary });
        setEditing(false);
      } catch {
        toast.error("Couldn't save the beat — try again");
      }
    });
  }

  function archive() {
    startTransition(async () => {
      try {
        await setBeatArchived(beat.id, true);
        toast.success("Beat archived. Find it under Archived beats, below the board");
      } catch {
        toast.error("Couldn't archive the beat — try again");
      }
    });
  }

  function toggleGap() {
    startTransition(async () => {
      try {
        await setBeatGap(beat.id, !beat.gap);
      } catch {
        toast.error("Couldn't update the beat — try again");
      }
    });
  }

  function remove() {
    const scenes = count > 0 ? ` Its ${count} scene${count === 1 ? "" : "s"} move to Unplanned.` : "";
    if (!window.confirm(`Delete this beat?${scenes} To keep it for later, archive it instead.`)) return;
    startTransition(async () => {
      try {
        await deleteBeat(beat.id);
        toast.success("Beat deleted");
      } catch {
        toast.error("Couldn't delete — try again");
      }
    });
  }

  return (
    <section ref={setNodeRef} style={style} className={`${SHELL} sm:w-72 sm:shrink-0`}>
      <header className="space-y-1.5 px-3 pt-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag beat ${beat.title} to reorder`}
            title="Drag to reorder beats"
            className="mt-0.5 flex h-7 w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 active:cursor-grabbing dark:hover:bg-neutral-800"
          >
            <span aria-hidden className="text-base leading-none">⋮⋮</span>
          </button>
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Beat title"
              className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-medium outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="text-sm font-semibold">{beat.title}</h3>
              {beat.gap && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  Gap to fill
                </span>
              )}
            </button>
          )}
          <span className="mt-1 shrink-0 text-xs tabular-nums text-neutral-500">{count}</span>
          <Menu
            label="⋯"
            buttonClassName="inline-flex h-7 items-center rounded px-1.5 text-sm text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            <button type="button" className={MENU_ITEM} onClick={() => setEditing(true)}>
              Edit title and summary
            </button>
            <button type="button" className={MENU_ITEM} onClick={toggleGap}>
              {beat.gap ? "Mark as filled" : "Mark as a gap"}
              <span className="block text-xs text-neutral-500">
                {beat.gap ? "It's worked out now" : "Still to be worked out"}
              </span>
            </button>
            <button type="button" className={MENU_ITEM} onClick={archive}>
              Archive beat
              <span className="block text-xs text-neutral-500">Put it away with its scenes</span>
            </button>
            <button type="button" className={`${MENU_ITEM} text-red-600 dark:text-red-400`} onClick={remove}>
              Delete beat
              <span className="block text-xs text-neutral-500">Its scenes move to Unplanned</span>
            </button>
          </Menu>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="What happens in this beat…"
              className="w-full resize-none rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={remove}
                className="text-xs text-neutral-500 hover:text-red-600"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={isPending}
                  className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          beat.summary && (
            <p className="line-clamp-3 whitespace-pre-wrap text-xs text-neutral-500">{beat.summary}</p>
          )
        )}

        {!editing && (
          <details className="text-xs">
            <summary className="cursor-pointer text-neutral-500">
              References{beat.references.length > 0 ? ` (${beat.references.length})` : ""}
            </summary>
            <div className="pt-2">
              <ReferenceList scope={{ beatId: beat.id }} initialReferences={beat.references} />
            </div>
          </details>
        )}
      </header>

      <ColumnBody columnId={beat.id}>{children}</ColumnBody>
      <AddScene projectId={projectId} beatId={beat.id} />
    </section>
  );
}
