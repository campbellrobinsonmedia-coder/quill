"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  deleteIdea,
  developIdeaIntoScript,
  developIdeaIntoSeries,
  promoteIdea,
  updateIdea,
} from "@/app/actions/ideas";
import { Menu, MENU_ITEM } from "@/components/menu";
import { useToast } from "@/components/toast";
import { FORMAT_TEMPLATES } from "@/lib/format-templates";

export type IdeaStatusValue = "SPARK" | "DEVELOPING" | "PROMOTED" | "ARCHIVED";

const STATUS_LABEL: Record<IdeaStatusValue, string> = {
  SPARK: "Spark",
  DEVELOPING: "Developing",
  PROMOTED: "Promoted",
  ARCHIVED: "Archived",
};

const STATUS_STYLE: Record<IdeaStatusValue, string> = {
  SPARK: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  DEVELOPING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PROMOTED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  ARCHIVED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
};

const ACTION_BUTTON =
  "inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-xs hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900";

export function IdeaItem({
  id,
  title = null,
  content,
  createdAt,
  tags = [],
  status = "SPARK",
  scopeLabel,
  scopeHref,
  promotedTo = null,
  projects,
}: {
  id: string;
  title?: string | null;
  content: string;
  createdAt: string;
  tags?: string[];
  status?: IdeaStatusValue;
  scopeLabel?: string;
  scopeHref?: string;
  promotedTo?: { href: string; label: string } | null;
  projects?: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [draftContent, setDraftContent] = useState(content);
  const [draftTags, setDraftTags] = useState(tags.join(" "));

  const long = content.length > 280 || content.split("\n").length > 4;

  function run(action: () => Promise<unknown>, success: string, failure: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
      } catch (err) {
        // redirect() from a server action surfaces as a thrown navigation signal.
        if (err && typeof err === "object" && "digest" in err) throw err;
        toast.error(failure);
      }
    });
  }

  function saveEdit() {
    startTransition(async () => {
      try {
        await updateIdea(id, {
          title: draftTitle,
          content: draftContent,
          tags: draftTags.split(/[\s,]+/).filter(Boolean),
        });
        setEditing(false);
        toast.success("Idea updated");
      } catch {
        toast.error("Couldn't save — an idea can't be empty");
      }
    });
  }

  if (editing) {
    return (
      <li className="space-y-2 p-4">
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Title"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={5}
          aria-label="Idea"
          className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <input
          value={draftTags}
          onChange={(e) => setDraftTags(e.target.value)}
          placeholder="Tags, e.g. horror feature"
          aria-label="Tags"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className={ACTION_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title && <p className="font-medium">{title}</p>}
          <p
            className={`whitespace-pre-wrap text-sm ${
              title ? "text-neutral-600 dark:text-neutral-400" : ""
            } ${long && !expanded ? "line-clamp-4" : ""}`}
          >
            {content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs text-neutral-500 underline underline-offset-2"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/ideas?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        {createdAt}
        {scopeLabel && (
          <>
            {" · "}
            {scopeHref ? (
              <Link href={scopeHref} className="underline underline-offset-2">
                {scopeLabel}
              </Link>
            ) : (
              scopeLabel
            )}
          </>
        )}
        {promotedTo && (
          <>
            {" · became "}
            <Link href={promotedTo.href} className="underline underline-offset-2">
              {promotedTo.label}
            </Link>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {status !== "PROMOTED" && (
          <select
            value={status}
            disabled={isPending}
            aria-label="Status"
            onChange={(e) =>
              run(
                () => updateIdea(id, { status: e.target.value as IdeaStatusValue }),
                "Status updated",
                "Couldn't change the status"
              )
            }
            className="h-9 rounded-md border border-neutral-300 bg-transparent px-2 text-xs outline-none dark:border-neutral-700"
          >
            <option value="SPARK">Spark</option>
            <option value="DEVELOPING">Developing</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        )}

        {status !== "PROMOTED" && (
          <Menu label="Develop" buttonClassName={ACTION_BUTTON}>
            <p className="px-3 pb-1 pt-2 text-xs text-neutral-500">New script</p>
            {FORMAT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={MENU_ITEM}
                onClick={() =>
                  run(
                    () => developIdeaIntoScript(id, t.id),
                    "Script created",
                    "Couldn't create the script"
                  )
                }
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className={`${MENU_ITEM} border-t border-neutral-100 dark:border-neutral-800`}
              onClick={() =>
                run(
                  () => developIdeaIntoSeries(id),
                  "Series created",
                  "Couldn't create the series"
                )
              }
            >
              New series
            </button>
          </Menu>
        )}

        {projects && projects.length > 0 && status !== "PROMOTED" && (
          <select
            defaultValue=""
            disabled={isPending}
            aria-label="Move to project"
            onChange={(e) => {
              const projectId = e.target.value;
              if (!projectId) return;
              run(() => promoteIdea(id, projectId), "Moved to project", "Couldn't move that idea");
            }}
            className="h-9 min-w-0 max-w-44 rounded-md border border-neutral-300 bg-transparent px-2 text-xs outline-none dark:border-neutral-700"
          >
            <option value="" disabled>
              File under…
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}

        <button type="button" onClick={() => setEditing(true)} className={ACTION_BUTTON}>
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!window.confirm("Delete this idea?")) return;
            run(() => deleteIdea(id), "Idea deleted", "Couldn't delete — try again");
          }}
          className="ml-auto inline-flex h-9 items-center px-2 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
