"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectMeta } from "@/app/actions/projects";

export function ProjectSettingsForm({
  projectId,
  initial,
  isEpisode = false,
  defaultPageTarget = null,
  showPageTarget = false,
}: {
  projectId: string;
  isEpisode?: boolean;
  initial: {
    title: string;
    logline: string | null;
    titlePageAuthor: string | null;
    titlePageContact: string | null;
    titlePageBasedOn: string | null;
    episodeTitle?: string | null;
    storyBy?: string | null;
    teleplayBy?: string | null;
    pageTarget?: number | null;
  };
  /** Screenplays only: the format's usual length, shown as the placeholder. */
  defaultPageTarget?: number | null;
  showPageTarget?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [logline, setLogline] = useState(initial.logline ?? "");
  const [author, setAuthor] = useState(initial.titlePageAuthor ?? "");
  const [contact, setContact] = useState(initial.titlePageContact ?? "");
  const [basedOn, setBasedOn] = useState(initial.titlePageBasedOn ?? "");
  const [episodeTitle, setEpisodeTitle] = useState(initial.episodeTitle ?? "");
  const [storyBy, setStoryBy] = useState(initial.storyBy ?? "");
  const [teleplayBy, setTeleplayBy] = useState(initial.teleplayBy ?? "");
  const [pageTarget, setPageTarget] = useState(initial.pageTarget ? String(initial.pageTarget) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = pageTarget.trim() === "" ? null : Number(pageTarget);
    if (showPageTarget && target !== null && !(Number.isInteger(target) && target >= 1 && target <= 1000)) {
      setError("Page target should be a whole number from 1 to 1000, or blank for the usual length.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await updateProjectMeta(projectId, {
        title: title.trim() || initial.title,
        logline,
        titlePageAuthor: author || null,
        titlePageContact: contact || null,
        titlePageBasedOn: basedOn || null,
        ...(showPageTarget ? { pageTarget: target } : {}),
        ...(isEpisode
          ? {
              episodeTitle: episodeTitle || null,
              storyBy: storyBy || null,
              teleplayBy: teleplayBy || null,
            }
          : {}),
      });
      setSaved(true);
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Logline</label>
        <textarea
          value={logline}
          onChange={(e) => setLogline(e.target.value)}
          rows={2}
          className={inputClass + " resize-none"}
        />
      </div>

      {showPageTarget && (
        <div className="space-y-1">
          <label htmlFor="page-target" className="text-sm font-medium">
            Page target
          </label>
          <input
            id="page-target"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            value={pageTarget}
            onChange={(e) => setPageTarget(e.target.value)}
            placeholder={defaultPageTarget ? String(defaultPageTarget) : "e.g. 100"}
            className={inputClass}
          />
          <p className="text-xs text-neutral-500">
            The Plan page tracks your script&apos;s pages against this.
            {defaultPageTarget ? ` Leave blank for the usual ${defaultPageTarget} for this format.` : ""}
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      )}

      {isEpisode && (
        <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-medium text-neutral-500">
            Episode credits
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm">Episode title</label>
              <input
                value={episodeTitle}
                onChange={(e) => setEpisodeTitle(e.target.value)}
                placeholder={'e.g. "Pilot"'}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Story by</label>
              <input
                value={storyBy}
                onChange={(e) => setStoryBy(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Teleplay by</label>
              <input
                value={teleplayBy}
                onChange={(e) => setTeleplayBy(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Title page (used in PDF / Fountain / FDX export)
        </h2>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Written by</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Based on</label>
            <input
              value={basedOn}
              onChange={(e) => setBasedOn(e.target.value)}
              placeholder="e.g. a story by..."
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm">Contact</label>
            <textarea
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={"Email, phone, or agency\n(one item per line)"}
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending && (
          <span className="text-sm text-neutral-500">Saved</span>
        )}
      </div>
    </form>
  );
}
