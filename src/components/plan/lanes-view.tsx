"use client";

import type { OutlineCardData } from "@/components/outline-card";
import { swatchFor } from "@/lib/outline-colors";
import { buildCharacterLanes, buildThreadLanes, type Lane } from "@/lib/plan-lanes";

export type LaneMode = "thread" | "character";

const CELL_W = "7rem";
const LABEL_W = "9rem";

// Rows are storylines (or characters), columns are scenes in story order: gaps
// show where a thread or a character drops out of the story.
export function LanesView({
  ordered,
  numbers,
  spans,
  mode,
  matches,
  openCardId,
  onOpen,
}: {
  ordered: OutlineCardData[];
  numbers: Map<string, number>;
  spans: { key: string; label: string; count: number }[];
  mode: LaneMode;
  matches: (card: OutlineCardData) => boolean;
  openCardId: string | null;
  onOpen: (id: string) => void;
}) {
  const lanes: Lane<OutlineCardData>[] =
    mode === "thread" ? buildThreadLanes(ordered) : buildCharacterLanes(ordered);

  if (ordered.length === 0) {
    return <p className="text-sm text-neutral-500">No scene cards yet — add some on the Board or the Wall.</p>;
  }
  if (lanes.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No characters are assigned to scene cards yet. Open a card to choose who&apos;s in the scene.
      </p>
    );
  }

  const template = `${LABEL_W} repeat(${ordered.length}, ${CELL_W})`;

  return (
    <div className="overflow-x-auto pb-4">
      <div role="table" aria-label="Scene cards by lane" className="grid w-max text-xs" style={{ gridTemplateColumns: template }}>
        {/* Beat header strip */}
        <div role="row" className="contents">
          <div className="sticky left-0 z-10 bg-white dark:bg-neutral-950" />
          {spans.map((s) => (
            <div
              key={s.key}
              style={{ gridColumn: `span ${s.count}` }}
              className="truncate border-l border-neutral-200 px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:border-neutral-800"
              title={s.label}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Scene numbers */}
        <div role="row" className="contents">
          <div className="sticky left-0 z-10 bg-white dark:bg-neutral-950" />
          {ordered.map((c) => (
            <div key={c.id} className="px-2 pb-1 text-[10px] tabular-nums text-neutral-400">
              {numbers.get(c.id)}
            </div>
          ))}
        </div>

        {lanes.map((lane) => (
          <div role="row" key={lane.key} className="contents">
            <div
              role="rowheader"
              className="sticky left-0 z-10 flex items-center border-t border-neutral-200 bg-white px-2 py-2 text-xs font-medium dark:border-neutral-800 dark:bg-neutral-950"
              title={lane.label}
            >
              <span className="truncate">{lane.label}</span>
              <span className="ml-1 shrink-0 text-[10px] font-normal text-neutral-400">
                {lane.cells.filter(Boolean).length}
              </span>
            </div>
            {lane.cells.map((card, i) => (
              <div
                role="cell"
                key={i}
                className="border-l border-t border-neutral-100 p-1 dark:border-neutral-900"
              >
                {card && (
                  <button
                    type="button"
                    onClick={() => onOpen(card.id)}
                    title={[card.title, card.summary, card.turn && `↳ ${card.turn}`].filter(Boolean).join("\n")}
                    className={`flex h-full min-h-12 w-full items-start gap-1 rounded border p-1.5 text-left text-[11px] leading-tight transition-opacity ${
                      openCardId === card.id
                        ? "border-neutral-900 dark:border-white"
                        : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800"
                    } ${matches(card) ? "" : "opacity-30"}`}
                  >
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: swatchFor(card.colorTag) }}
                    />
                    <span className="line-clamp-3 min-w-0">{card.title}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
