"use client";

import { useState } from "react";
import type { ScreenplayContent } from "@/lib/draft-content";

export type OutlineCardInfo = {
  id: string;
  title: string;
  linkedSceneId: string | null;
  beatTitle: string | null;
};

export function SceneNavigator({
  content,
  sceneNumbers,
  cards,
  onJump,
  onMove,
  onAddCard,
  onClose,
}: {
  content: ScreenplayContent;
  sceneNumbers: Map<string, string>;
  cards: OutlineCardInfo[];
  onJump: (sceneId: string) => void;
  onMove: (sceneId: string, delta: -1 | 1) => void;
  onAddCard: (sceneId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState<string | null>(null);
  const scenes = content.elements.filter((el) => el.type === "scene_heading");
  const cardByScene = new Map(
    cards.filter((c) => c.linkedSceneId).map((c) => [c.linkedSceneId!, c])
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white sm:static sm:z-auto sm:h-full sm:w-80 sm:shrink-0 sm:border-l sm:border-neutral-200 dark:bg-neutral-950 sm:dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Scenes ({scenes.length})</h2>
        <button onClick={onClose} className="text-sm text-neutral-500">
          Close
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {scenes.length === 0 && (
          <li className="p-4 text-sm text-neutral-500">
            No scenes yet — start with a scene heading.
          </li>
        )}
        {scenes.map((scene, i) => {
          const card = cardByScene.get(scene.id);
          const text = scene.text.trim();
          return (
            <li
              key={scene.id}
              className="flex items-start gap-2 border-b border-neutral-100 p-3 text-sm dark:border-neutral-900"
            >
              <button
                type="button"
                onClick={() => onJump(scene.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className={`truncate font-medium ${scene.omitted ? "line-through opacity-60" : ""}`}>
                  <span className="mr-1.5 tabular-nums text-neutral-500">
                    {sceneNumbers.get(scene.id)}
                  </span>
                  {text || "Untitled scene"}
                </p>
                {card ? (
                  <p className="truncate text-xs text-neutral-500">
                    Card: {card.title}
                    {card.beatTitle ? ` · ${card.beatTitle}` : ""}
                  </p>
                ) : (
                  text && <p className="text-xs text-neutral-500">No card on the Plan board</p>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-0.5">
                {!card && text && !scene.omitted && (
                  <button
                    type="button"
                    disabled={adding === scene.id}
                    onClick={async () => {
                      setAdding(scene.id);
                      try {
                        await onAddCard(scene.id);
                      } finally {
                        setAdding(null);
                      }
                    }}
                    className="mr-1 rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    {adding === scene.id ? "…" : "+ Card"}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Move scene ${sceneNumbers.get(scene.id)} up`}
                  disabled={i === 0}
                  onClick={() => onMove(scene.id, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move scene ${sceneNumbers.get(scene.id)} down`}
                  disabled={i === scenes.length - 1}
                  onClick={() => onMove(scene.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
