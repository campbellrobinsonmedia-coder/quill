"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteCard, moveCardToEpisode, updateCard } from "@/app/actions/outline";
import { sceneFactsForCard, startSceneFromCard } from "@/app/actions/scene-sync";
import { useToast } from "@/components/toast";
import { OUTLINE_COLORS } from "@/lib/outline-colors";
import { sceneHeadingFromLabel } from "@/lib/card-face";
import type { OutlineCardData } from "@/components/outline-card";
import type { EpisodeTarget } from "@/lib/card-move";
import { CARD_STATUSES, STATUS_LABELS, isCardStatus, type CardStat } from "@/lib/plan-progress";

const FIELD =
  "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";
const LABEL = "mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400";

// The side panel for a scene card (a sheet that fills the screen on a phone).
export function CardEditor({
  projectId,
  canStartScene,
  card,
  number,
  availableCharacters,
  availableScenes,
  beatOptions,
  episodeTargets,
  sceneMissing,
  stat,
  onClose,
}: {
  projectId: string;
  /** Screenplay projects: a card can start its scene in the script. */
  canStartScene: boolean;
  card: OutlineCardData;
  number: number;
  availableCharacters: { id: string; name: string }[];
  availableScenes: { id: string; label: string }[];
  beatOptions: { id: string; title: string }[];
  /** Other episodes in the series; empty for a standalone project. */
  episodeTargets: EpisodeTarget[];
  sceneMissing: boolean;
  /** Progress read from the script. */
  stat?: CardStat;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(card.title);
  const [summary, setSummary] = useState(card.summary ?? "");
  const [turn, setTurn] = useState(card.turn ?? "");
  const [act, setAct] = useState(card.act ?? "");
  const [storyThread, setStoryThread] = useState(card.storyThread ?? "");
  const [location, setLocation] = useState(card.location ?? "");
  const [emotion, setEmotion] = useState(card.emotion ?? "");
  const [linkedSceneId, setLinkedSceneId] = useState(card.linkedSceneId ?? "");
  const [beatId, setBeatId] = useState(card.beatId ?? "");
  const [status, setStatus] = useState(isCardStatus(card.status) ? card.status : "idea");
  const [moveTo, setMoveTo] = useState("");
  const [colorTag, setColorTag] = useState(card.colorTag ?? "neutral");
  const [characterIds, setCharacterIds] = useState(new Set(card.characters.map((c) => c.id)));

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function toggleCharacter(id: string) {
    setCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fields() {
    return {
      title: title.trim() || "Untitled",
      summary,
      turn: turn.trim() || null,
      status,
      act: act || null,
      location: location || null,
      emotion: emotion || null,
      storyThread: storyThread || null,
      linkedSceneId: linkedSceneId || null,
      beatId: beatOptions.length > 0 ? beatId || null : undefined,
      colorTag,
      characterIds: Array.from(characterIds),
    };
  }

  // Saves what's in the panel, then makes the scene in the script and opens it.
  function startScene() {
    startTransition(async () => {
      try {
        await updateCard(card.id, fields());
        const { sceneId } = await startSceneFromCard(card.id);
        router.push(`/projects/${projectId}/write?scene=${sceneId}`);
      } catch {
        toast.error("Couldn't start the scene — try again");
      }
    });
  }

  // Fills the location and characters from what the script says about the
  // linked scene. It only fills the panel; Save keeps it.
  function updateFromScene() {
    startTransition(async () => {
      try {
        const facts = await sceneFactsForCard(card.id);
        if (!facts) {
          toast.error("Couldn't find that scene in the script");
          return;
        }
        if (facts.location) {
          setLocation((prev) => (prev.trim().toLowerCase() === facts.location.toLowerCase() ? prev : facts.location));
        }
        setCharacterIds((prev) => new Set([...prev, ...facts.characterIds]));
        toast.success(
          facts.unmatched.length > 0
            ? `Filled from the scene — save to keep it. Not saved as characters: ${facts.unmatched.join(", ")}`
            : "Filled from the scene — save to keep it"
        );
      } catch {
        toast.error("Couldn't read the scene — try again");
      }
    });
  }

  function save() {
    setSaving(true);
    startTransition(async () => {
      try {
        await updateCard(card.id, fields());
        toast.success("Card saved");
        onClose();
      } catch {
        toast.error("Couldn't save the card — try again");
      } finally {
        setSaving(false);
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete this scene card? The scene in your script is not affected.")) return;
    startTransition(async () => {
      try {
        await deleteCard(card.id);
        toast.success("Card deleted");
        onClose();
      } catch {
        toast.error("Couldn't delete — try again");
      }
    });
  }

  // Moves the card (with what's in the panel) to another episode.
  function move() {
    const target = episodeTargets.find((t) => t.id === moveTo);
    if (!target) return;
    const sceneNote = card.linkedSceneId
      ? " Its scene text stays in this episode's script; the card is unlinked from it."
      : "";
    if (!window.confirm(`Move this card to ${target.label}?${sceneNote}`)) return;
    startTransition(async () => {
      try {
        await updateCard(card.id, fields());
        const { droppedCharacters } = await moveCardToEpisode(card.id, target.id);
        toast.success(
          droppedCharacters.length > 0
            ? `Moved to ${target.label}. Not carried over (no match there): ${droppedCharacters.join(", ")}`
            : `Moved to ${target.label}`
        );
        onClose();
      } catch {
        toast.error("Couldn't move the card — try again");
      }
    });
  }

  const linkedExists = availableScenes.some((s) => s.id === linkedSceneId);

  return (
    <div
      role="dialog"
      aria-label={`Edit scene card ${number}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          save();
        }
      }}
      className="fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col bg-white shadow-xl sm:left-auto sm:w-[26rem] sm:border-l sm:border-neutral-200 dark:bg-neutral-950 sm:dark:border-neutral-800"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Scene card {number}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label htmlFor="card-title" className={LABEL}>
            Title
          </label>
          <input
            id="card-title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="card-summary" className={LABEL}>
            What happens
          </label>
          <textarea
            id="card-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="The scene in a sentence or two…"
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <label htmlFor="card-turn" className={LABEL}>
            The turn — what changes
          </label>
          <textarea
            id="card-turn"
            value={turn}
            onChange={(e) => setTurn(e.target.value)}
            rows={2}
            placeholder="e.g. hope → doubt, or a secret kept → exposed"
            className={`${FIELD} resize-y`}
          />
        </div>

        <div>
          <p className={LABEL}>Progress</p>
          <div role="group" aria-label="Progress" className="inline-flex divide-x divide-neutral-300 rounded-md border border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700">
            {CARD_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className="px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md aria-pressed:bg-neutral-900 aria-pressed:text-white dark:aria-pressed:bg-white dark:aria-pressed:text-neutral-900"
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {stat?.pages != null && !sceneMissing
              ? `About ${stat.pages} page${stat.pages === 1 ? "" : "s"} in the script so far. `
              : ""}
            A scene with text in the script counts as started; mark it written when it&apos;s done.
          </p>
        </div>

        {availableCharacters.length > 0 && (
          <div>
            <p className={LABEL}>Characters in the scene</p>
            <div className="flex flex-wrap gap-1.5">
              {availableCharacters.map((c) => {
                const selected = characterIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleCharacter(c.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="card-thread" className={LABEL}>
              Storyline
            </label>
            <input
              id="card-thread"
              value={storyThread}
              onChange={(e) => setStoryThread(e.target.value)}
              list="story-thread-suggestions"
              placeholder="A, B, C…"
              className={FIELD}
            />
            <datalist id="story-thread-suggestions">
              <option value="A" />
              <option value="B" />
              <option value="C" />
            </datalist>
          </div>
          <div>
            <label htmlFor="card-act" className={LABEL}>
              Act
            </label>
            <input
              id="card-act"
              value={act}
              onChange={(e) => setAct(e.target.value)}
              placeholder="e.g. Act 2"
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="card-location" className={LABEL}>
              Location
            </label>
            <input
              id="card-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="card-emotion" className={LABEL}>
              Emotion
            </label>
            <input
              id="card-emotion"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        {beatOptions.length > 0 && (
          <div>
            <label htmlFor="card-beat" className={LABEL}>
              Beat
            </label>
            <select
              id="card-beat"
              value={beatId}
              onChange={(e) => setBeatId(e.target.value)}
              className={FIELD}
            >
              <option value="">Unplanned (no beat)</option>
              {beatOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {(availableScenes.length > 0 || canStartScene) && (
          <div>
            <label htmlFor="card-scene" className={LABEL}>
              Scene in the script
            </label>
            {availableScenes.length > 0 && (
            <select
              id="card-scene"
              value={linkedExists ? linkedSceneId : ""}
              onChange={(e) => setLinkedSceneId(e.target.value)}
              className={FIELD}
            >
              <option value="">Not linked to a scene</option>
              {availableScenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            )}
            {sceneMissing && linkedSceneId && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                The scene this card pointed to was removed from the script. Pick another, or
                save to unlink it.
                <button
                  type="button"
                  onClick={() => setLinkedSceneId("")}
                  className="ml-1 underline underline-offset-2"
                >
                  Unlink now
                </button>
              </p>
            )}
            {linkedExists && (
              <p className="mt-1 text-xs text-neutral-500">
                {sceneHeadingFromLabel(availableScenes.find((s) => s.id === linkedSceneId)?.label)}
              </p>
            )}
            {canStartScene && (
              <div className="mt-2 flex flex-wrap gap-2">
                {!linkedExists && (
                  <button
                    type="button"
                    onClick={startScene}
                    disabled={isPending}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
                  >
                    Start this scene in the script
                  </button>
                )}
                {linkedExists && (
                  <>
                    <Link
                      href={`/projects/${projectId}/write?scene=${linkedSceneId}`}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      Open in the script
                    </Link>
                    <button
                      type="button"
                      onClick={updateFromScene}
                      disabled={isPending || linkedSceneId !== card.linkedSceneId}
                      title={
                        linkedSceneId !== card.linkedSceneId
                          ? "Save the card first to read from the newly chosen scene"
                          : "Fill the location and characters from the script"
                      }
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      Update from scene
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {episodeTargets.length > 0 && (
          <div>
            <label htmlFor="card-move" className={LABEL}>
              Move to another episode
            </label>
            <div className="flex gap-2">
              <select
                id="card-move"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
                className={FIELD}
              >
                <option value="">Choose an episode…</option>
                {episodeTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={move}
                disabled={isPending || !moveTo}
                className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Move
              </button>
            </div>
          </div>
        )}

        <div>
          <p className={LABEL}>Color</p>
          <div className="flex flex-wrap gap-2">
            {OUTLINE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={colorTag === c.id}
                onClick={() => setColorTag(c.id)}
                className={`h-6 w-6 rounded-full ${
                  colorTag === c.id ? "ring-2 ring-neutral-900 ring-offset-2 dark:ring-white dark:ring-offset-neutral-950" : ""
                }`}
                style={{ backgroundColor: c.swatch }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className="px-2 py-1.5 text-sm text-neutral-500 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {saving && isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
