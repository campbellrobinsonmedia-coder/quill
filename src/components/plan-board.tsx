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
import { CardEditor } from "@/components/card-editor";
import { BeatColumn, UnplannedColumn, type PlanBeat } from "@/components/beat-column";
import { Menu, MENU_ITEM } from "@/components/menu";
import { useToast } from "@/components/toast";
import { useMediaQuery } from "@/lib/use-media-query";
import { usePersistedChoice } from "@/lib/use-persisted-choice";
import {
  decodeFilter,
  encodeFilter,
  filterOptions,
  matchesFilter,
  type CardFilter,
} from "@/lib/card-filter";
import { beatSpans } from "@/lib/plan-lanes";
import { WallView, WALL_SIZES, type WallSize } from "@/components/plan/wall-view";
import { LanesView, type LaneMode } from "@/components/plan/lanes-view";
import { OutlineView } from "@/components/plan/outline-view";
import { ProgressPanel } from "@/components/plan/progress-panel";
import type { PlanProgress } from "@/lib/plan-progress";
import { createProjectBeat, applyBeatTemplate, reorderBeats } from "@/app/actions/beats";
import { createCard, saveOutlineLayout } from "@/app/actions/outline";
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
  flattenLayout,
  moveBeat,
  moveCard,
  moveCardOnto,
  serializeLayout,
  type PlanLayout,
} from "@/lib/plan-layout";

const VIEWS = ["board", "wall", "lanes", "outline"] as const;
type PlanView = (typeof VIEWS)[number];
const VIEW_LABELS: Record<PlanView, string> = {
  board: "Board",
  wall: "Wall",
  lanes: "Lanes",
  outline: "Outline",
};
const LANE_MODES = ["thread", "character"] as const;
const SEGMENTS =
  "inline-flex divide-x divide-neutral-300 rounded-md border border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700";
const SEGMENT =
  "px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md aria-pressed:bg-neutral-900 aria-pressed:text-white dark:aria-pressed:bg-white dark:aria-pressed:text-neutral-900";

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
  progress = null,
  initialOpenCardId = null,
}: {
  projectId: string;
  initialBeats: (PlanBeat & { order: number })[];
  initialCards: (OutlineCardData & { order: number })[];
  availableCharacters: { id: string; name: string }[];
  availableScenes?: { id: string; label: string }[];
  seasonBeats?: OverviewBeat[];
  sync?: ScriptSync | null;
  progress?: PlanProgress | null;
  /** Open this card's panel on arrival (a link from the script's Scenes panel). */
  initialOpenCardId?: string | null;
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
  const [openCardId, setOpenCardId] = useState<string | null>(initialOpenCardId);

  const [view, setView] = usePersistedChoice<PlanView>(
    `quill:plan-view:${projectId}`,
    VIEWS,
    "board"
  );
  const [wallSize, setWallSize] = usePersistedChoice<WallSize>(
    `quill:plan-wall-size:${projectId}`,
    WALL_SIZES.map((s) => s.id),
    "m"
  );
  const [laneMode, setLaneMode] = usePersistedChoice<LaneMode>(
    `quill:plan-lanes:${projectId}`,
    LANE_MODES,
    "thread"
  );
  const [filter, setFilter] = useState<CardFilter | null>(null);
  const options = filterOptions(initialCards);
  const hasOptions =
    options.characters.length > 0 || options.threads.length > 0 || options.locations.length > 0;
  const matches = (card: OutlineCardData) => matchesFilter(card, filter);

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

  function addCard(title: string) {
    startTransition(async () => {
      try {
        await createCard(projectId, title);
      } catch {
        toast.error("Couldn't add that card — try again");
      }
    });
  }

  function moveOnWall(activeId: string, overId: string) {
    const previous = layoutRef.current;
    const next = moveCardOnto(previous, activeId, overId);
    if (JSON.stringify(next) === JSON.stringify(previous)) return;
    setLayout(next);
    persist(next, previous);
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
  const openCard = openCardId ? cardsById.get(openCardId) : null;
  const orderedIds = flattenLayout(layout);
  const orderedCards = orderedIds.flatMap((id) => cardsById.get(id) ?? []);
  const sceneLabelOf = (card: OutlineCardData) =>
    card.linkedSceneId ? sync?.sceneLabels[card.linkedSceneId] : undefined;
  const statOf = (id: string) => progress?.cardStats[id];
  const isOrphaned = (id: string) => sync?.orphanedCardIds.includes(id) ?? false;
  const beatTitleOf = (id: string) => {
    if (!hasBeats) return undefined;
    const col = columnOf(layout, id);
    return !col || col === UNPLANNED ? "Unplanned" : beatsById.get(col)?.title;
  };
  const outlineGroups = [
    ...(unplannedCount > 0 || !hasBeats
      ? [
          {
            key: UNPLANNED,
            label: hasBeats ? "Unplanned" : "Scenes",
            summary: null,
            ids: layout.columns[UNPLANNED],
          },
        ]
      : []),
    ...layout.beatIds.map((id) => ({
      key: id,
      label: beatsById.get(id)?.title ?? "Beat",
      summary: beatsById.get(id)?.summary ?? null,
      ids: layout.columns[id] ?? [],
    })),
  ];

  function renderCard(id: string) {
    const card = cardsById.get(id);
    if (!card) return null;
    return (
      <OutlineCard
        key={id}
        card={card}
        number={numbers.get(id) ?? 0}
        projectId={projectId}
        sceneLabel={sceneLabelOf(card)}
        sceneMissing={isOrphaned(id)}
        active={openCardId === id}
        dimmed={!matches(card)}
        stat={statOf(id)}
        onOpen={() => setOpenCardId(id)}
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
        {initialCards.length > 0 && (
          <Menu
            label="Print"
            buttonClassName="inline-flex h-10 items-center rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <a
              className={MENU_ITEM}
              href={`/api/projects/${projectId}/export/outline?kind=cards`}
              download
            >
              Index cards (PDF)
              <span className="block text-xs text-neutral-500">3×5, four to a sheet, to cut out</span>
            </a>
            <a
              className={MENU_ITEM}
              href={`/api/projects/${projectId}/export/outline?kind=outline`}
              download
            >
              Outline (PDF)
              <span className="block text-xs text-neutral-500">Every scene on one page</span>
            </a>
          </Menu>
        )}
      </div>

      {progress && <ProgressPanel progress={progress} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="View" className={SEGMENTS}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={SEGMENT}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        {view === "wall" && (
          <div role="group" aria-label="Card size" className={SEGMENTS}>
            {WALL_SIZES.map((sz) => (
              <button
                key={sz.id}
                type="button"
                aria-pressed={wallSize === sz.id}
                aria-label={`Card size ${sz.label}`}
                onClick={() => setWallSize(sz.id)}
                className={SEGMENT}
              >
                {sz.label}
              </button>
            ))}
          </div>
        )}
        {view === "lanes" && (
          <div role="group" aria-label="Rows" className={SEGMENTS}>
            <button
              type="button"
              aria-pressed={laneMode === "thread"}
              onClick={() => setLaneMode("thread")}
              className={SEGMENT}
            >
              Storylines
            </button>
            <button
              type="button"
              aria-pressed={laneMode === "character"}
              onClick={() => setLaneMode("character")}
              className={SEGMENT}
            >
              Characters
            </button>
          </div>
        )}
        {hasOptions && (
          <div className="flex items-center gap-2">
            <label htmlFor="plan-highlight" className="text-xs text-neutral-500">
              Highlight
            </label>
            <select
              id="plan-highlight"
              value={encodeFilter(filter)}
              onChange={(e) => setFilter(decodeFilter(e.target.value))}
              className="max-w-48 rounded-md border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Nothing</option>
              {options.characters.length > 0 && (
                <optgroup label="Character">
                  {options.characters.map((c) => (
                    <option key={c.id} value={encodeFilter({ kind: "character", value: c.id })}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.threads.length > 0 && (
                <optgroup label="Storyline">
                  {options.threads.map((t) => (
                    <option key={t} value={encodeFilter({ kind: "thread", value: t })}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.locations.length > 0 && (
                <optgroup label="Location">
                  {options.locations.map((l) => (
                    <option key={l} value={encodeFilter({ kind: "location", value: l })}>
                      {l}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="text-xs text-neutral-500 underline underline-offset-2"
              >
                Clear
              </button>
            )}
          </div>
        )}
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

      {openCard && (
        <CardEditor
          key={openCard.id}
          projectId={projectId}
          canStartScene={sync !== null}
          card={openCard}
          number={numbers.get(openCard.id) ?? 0}
          availableCharacters={availableCharacters}
          availableScenes={availableScenes}
          beatOptions={beatOptions}
          sceneMissing={sync?.orphanedCardIds.includes(openCard.id) ?? false}
          stat={statOf(openCard.id)}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {view === "wall" && (
        <WallView
          projectId={projectId}
          orderedIds={orderedIds}
          cardsById={cardsById}
          beatTitleOf={beatTitleOf}
          numbers={numbers}
          sceneLabelOf={sceneLabelOf}
          isOrphaned={isOrphaned}
          statOf={statOf}
          matches={matches}
          openCardId={openCardId}
          size={wallSize}
          onOpen={setOpenCardId}
          onMove={moveOnWall}
          onAdd={addCard}
        />
      )}

      {view === "lanes" && (
        <LanesView
          ordered={orderedCards}
          numbers={numbers}
          spans={beatSpans(layout, (id) => beatsById.get(id)?.title ?? "Beat")}
          mode={laneMode}
          matches={matches}
          openCardId={openCardId}
          onOpen={setOpenCardId}
        />
      )}

      {view === "outline" && (
        <OutlineView
          groups={outlineGroups}
          cardsById={cardsById}
          numbers={numbers}
          sceneLabelOf={sceneLabelOf}
          isOrphaned={isOrphaned}
          statOf={statOf}
          matches={matches}
          openCardId={openCardId}
          onOpen={setOpenCardId}
          onAdd={addCard}
        />
      )}

      {view === "board" && (
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
      )}
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
