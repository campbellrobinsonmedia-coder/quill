"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { OutlineCard, type OutlineCardData } from "@/components/outline-card";
import { BeatColumn, UnplannedColumn, type PlanBeat } from "@/components/beat-column";
import { Menu, MENU_ITEM } from "@/components/menu";
import { useToast } from "@/components/toast";
import { useMediaQuery } from "@/lib/use-media-query";
import { createProjectBeat, applyBeatTemplate, reorderBeats } from "@/app/actions/beats";
import { saveOutlineLayout } from "@/app/actions/outline";
import {
  addCardsForScenes,
  reorderOutlineToScript,
  reorderScriptToOutline,
} from "@/app/actions/scene-sync";
import { BEAT_TEMPLATES } from "@/lib/beat-templates";
import {
  UNPLANNED,
  buildLayout,
  cardNumbers,
  columnOf,
  moveBeat,
  moveCard,
  serializeLayout,
  type PlanLayout,
} from "@/lib/plan-layout";

type OverviewBeat = { id: string; title: string; summary: string | null };

export type ScriptSync = {
  unlinkedScenes: number;
  scriptOutOfOrder: boolean;
  orphanedCardIds: string[];
  /** scene heading id -> label, for showing which scene a card is linked to */
  sceneLabels: Record<string, string>;
};

// Cards hit-test against other cards and column bodies; columns only against
// other columns. Without this the column wrapper swallows every card drop.
const collisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  if (activeType === "column") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "column"
      ),
    });
  }
  const targets = args.droppableContainers.filter((c) => {
    const type = c.data.current?.type;
    return type === "card" || type === "container";
  });
  const hits = pointerWithin({ ...args, droppableContainers: targets });
  if (hits.length > 0) {
    const card = hits.find((h) => targets.find((t) => t.id === h.id)?.data.current?.type === "card");
    return card ? [card] : [hits[0]];
  }
  return closestCenter({ ...args, droppableContainers: targets });
};

export function PlanBoard({
  projectId,
  initialBeats,
  initialCards,
  availableCharacters,
  availableScenes = [],
  seasonBeats = [],
  sync = null,
}: {
  projectId: string;
  initialBeats: (PlanBeat & { order: number })[];
  initialCards: (OutlineCardData & { order: number })[];
  availableCharacters: { id: string; name: string }[];
  availableScenes?: { id: string; label: string }[];
  seasonBeats?: OverviewBeat[];
  sync?: ScriptSync | null;
}) {
  const toast = useToast();
  const stacked = useMediaQuery("(max-width: 639px)");
  const [, startTransition] = useTransition();

  const [layout, setLayout] = useState<PlanLayout>(() =>
    buildLayout(initialBeats, initialCards)
  );
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  });

  // Re-sync when the server sends fresh data (after any action revalidates).
  const [prevSource, setPrevSource] = useState({ initialBeats, initialCards });
  if (prevSource.initialBeats !== initialBeats || prevSource.initialCards !== initialCards) {
    setPrevSource({ initialBeats, initialCards });
    setLayout(buildLayout(initialBeats, initialCards));
  }

  const beatsById = new Map(initialBeats.map((b) => [b.id, b]));
  const cardsById = new Map(initialCards.map((c) => [c.id, c]));
  const numbers = cardNumbers(layout);
  const beatOptions = layout.beatIds.map((id) => ({ id, title: beatsById.get(id)?.title ?? "Beat" }));

  const [newBeat, setNewBeat] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function persist(next: PlanLayout, previous: PlanLayout) {
    startTransition(async () => {
      try {
        await saveOutlineLayout(projectId, serializeLayout(next));
      } catch {
        setLayout(previous);
        toast.error("Couldn't save the new order — it's been put back");
      }
    });
  }

  const dragStartLayout = useRef<PlanLayout>(layout);

  function handleDragStart(event: DragStartEvent) {
    dragStartLayout.current = layoutRef.current;
    if (event.active.data.current?.type === "card") setActiveCardId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "card") return;
    const current = layoutRef.current;
    const activeId = String(active.id);
    const overType = over.data.current?.type;

    let target: string | null = null;
    let index: number | undefined;
    if (overType === "container") {
      target = over.data.current?.columnId as string;
    } else if (overType === "card") {
      target = columnOf(current, String(over.id));
      if (target) index = current.columns[target].indexOf(String(over.id));
    }
    if (!target || target === columnOf(current, activeId)) return;
    setLayout(moveCard(current, activeId, target, index));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);
    const type = active.data.current?.type;
    let next = layoutRef.current;

    if (over && type === "column" && active.id !== over.id) {
      const toIndex = next.beatIds.indexOf(String(over.id));
      if (toIndex >= 0) next = moveBeat(next, String(active.id), toIndex);
    } else if (over && type === "card" && over.data.current?.type === "card" && active.id !== over.id) {
      const col = columnOf(next, String(over.id));
      if (col && col === columnOf(next, String(active.id))) {
        next = moveCard(next, String(active.id), col, next.columns[col].indexOf(String(over.id)));
      }
    }

    if (JSON.stringify(next) === JSON.stringify(dragStartLayout.current)) return;
    setLayout(next);
    if (type === "column") {
      startTransition(async () => {
        try {
          await reorderBeats({ projectId }, next.beatIds);
          await saveOutlineLayout(projectId, serializeLayout(next));
        } catch {
          setLayout(dragStartLayout.current);
          toast.error("Couldn't save the new order — it's been put back");
        }
      });
    } else {
      persist(next, dragStartLayout.current);
    }
  }

  function addBeat(e: React.FormEvent) {
    e.preventDefault();
    const title = newBeat.trim();
    if (!title) return;
    setNewBeat("");
    startTransition(async () => {
      try {
        await createProjectBeat(projectId, title);
      } catch {
        toast.error("Couldn't add that beat — try again");
      }
    });
  }

  function addTemplate(templateId: string) {
    startTransition(async () => {
      try {
        await applyBeatTemplate(projectId, templateId);
        toast.success("Beats added");
      } catch {
        toast.error("Couldn't add the template — try again");
      }
    });
  }

  const hasBeats = layout.beatIds.length > 0;
  const unplannedCount = layout.columns[UNPLANNED].length;
  const activeCard = activeCardId ? cardsById.get(activeCardId) : null;

  function renderCard(id: string) {
    const card = cardsById.get(id);
    if (!card) return null;
    return (
      <OutlineCard
        key={id}
        card={card}
        number={numbers.get(id) ?? 0}
        projectId={projectId}
        availableCharacters={availableCharacters}
        availableScenes={availableScenes}
        beatOptions={beatOptions}
        sceneLabel={card.linkedSceneId ? sync?.sceneLabels[card.linkedSceneId] : undefined}
        sceneMissing={sync?.orphanedCardIds.includes(id) ?? false}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={addBeat} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
          <input
            value={newBeat}
            onChange={(e) => setNewBeat(e.target.value)}
            placeholder="New beat (e.g. Opening image)…"
            aria-label="New beat"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Add beat
          </button>
        </form>
        <Menu
          label="Beat template"
          buttonClassName="inline-flex h-10 items-center rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <p className="px-3 pb-1 pt-2 text-xs text-neutral-500">Add a ready-made set of beats</p>
          {BEAT_TEMPLATES.map((t) => (
            <button key={t.id} type="button" className={MENU_ITEM} onClick={() => addTemplate(t.id)}>
              {t.label}
              <span className="block text-xs text-neutral-500">{t.beats.length} beats</span>
            </button>
          ))}
        </Menu>
      </div>

      {sync && (sync.unlinkedScenes > 0 || sync.scriptOutOfOrder) && (
        <ScriptSyncBar projectId={projectId} sync={sync} />
      )}

      {seasonBeats.length > 0 && (
        <details className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
            From the season arc — {seasonBeats.length} beat{seasonBeats.length === 1 ? "" : "s"} assigned to this episode
          </summary>
          <ul className="mt-2 space-y-1.5">
            {seasonBeats.map((b) => (
              <li key={b.id}>
                <span className="font-medium">{b.title}</span>
                {b.summary && <span className="text-neutral-500"> — {b.summary}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <DndContext
        id={`plan-board-${projectId}`}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveCardId(null);
          setLayout(dragStartLayout.current);
        }}
      >
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:overflow-x-auto">
          <UnplannedColumn
            projectId={projectId}
            title={hasBeats ? "Unplanned scenes" : "Scenes"}
            wide={!hasBeats}
            count={unplannedCount}
          >
            <SortableContext
              items={layout.columns[UNPLANNED]}
              strategy={verticalListSortingStrategy}
            >
              {layout.columns[UNPLANNED].map(renderCard)}
            </SortableContext>
            {unplannedCount === 0 && (
              <p className="px-1 py-2 text-xs text-neutral-500">
                {hasBeats
                  ? "Drag scenes here, or add one below."
                  : "No scenes yet — add one below, or start from a beat template."}
              </p>
            )}
          </UnplannedColumn>

          <SortableContext
            items={layout.beatIds}
            strategy={stacked ? verticalListSortingStrategy : horizontalListSortingStrategy}
          >
            {layout.beatIds.map((beatId) => {
              const beat = beatsById.get(beatId);
              if (!beat) return null;
              const ids = layout.columns[beatId] ?? [];
              return (
                <BeatColumn key={beatId} projectId={projectId} beat={beat} count={ids.length}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {ids.map(renderCard)}
                  </SortableContext>
                  {ids.length === 0 && (
                    <p className="px-1 py-2 text-xs text-neutral-500">
                      No scenes yet — drag one here or add below.
                    </p>
                  )}
                </BeatColumn>
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rounded-md border border-neutral-300 bg-white p-3 text-sm font-medium shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              {activeCard.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ScriptSyncBar({ projectId, sync }: { projectId: string; sync: ScriptSync }) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
      } catch {
        toast.error("That didn't work — try again");
      }
    });
  }

  const button =
    "inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-xs hover:bg-white disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800";

  return (
    <div
      role="status"
      className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
    >
      {sync.unlinkedScenes > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            {sync.unlinkedScenes} scene{sync.unlinkedScenes === 1 ? "" : "s"} in your script
            {sync.unlinkedScenes === 1 ? " doesn't" : " don't"} have a card yet.
          </p>
          <button
            type="button"
            disabled={isPending}
            className={button}
            onClick={() => run(() => addCardsForScenes(projectId), "Cards added")}
          >
            Add cards
          </button>
        </div>
      )}
      {sync.scriptOutOfOrder && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>The scenes are in a different order in the script than on this board.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              className={button}
              onClick={() => {
                if (
                  !window.confirm(
                    "Rearrange the script's scenes to follow this board? Your current script is saved to version history first, so you can restore it."
                  )
                )
                  return;
                run(() => reorderScriptToOutline(projectId), "Script reordered");
              }}
            >
              Match script to board
            </button>
            <button
              type="button"
              disabled={isPending}
              className={button}
              onClick={() =>
                run(() => reorderOutlineToScript(projectId), "Board reordered within beats")
              }
            >
              Match board to script
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
