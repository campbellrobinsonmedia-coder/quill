"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { createIdea } from "@/app/actions/ideas";
import { useToast } from "@/components/toast";
import { emitShellEvent, OPEN_PALETTE_EVENT, QUICK_CAPTURE_EVENT } from "@/lib/shell-events";

const PROJECT_PATH = /^\/projects\/([^/]+)/;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

export function QuickCapture() {
  const pathname = usePathname();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [toProject, setToProject] = useState(true);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const projectId = PROJECT_PATH.exec(pathname)?.[1] ?? null;
  // The editor needs the whole screen (and its own toolbar space).
  const hidden = pathname.endsWith("/write");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        emitShellEvent(OPEN_PALETTE_EVENT);
      } else if (e.key === "i" && !hidden) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onQuickCapture() {
      if (!hidden) setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(QUICK_CAPTURE_EVENT, onQuickCapture);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(QUICK_CAPTURE_EVENT, onQuickCapture);
    };
  }, [hidden]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function submit() {
    const content = value.trim();
    if (!content) return;
    startTransition(async () => {
      try {
        await createIdea(content, projectId && toProject ? projectId : null);
        setValue("");
        setOpen(false);
        toast.success("Idea saved");
      } catch {
        toast.error("Couldn't save that idea — try again");
      }
    });
  }

  if (hidden) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add idea"
        title="Quick add idea (i)"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-2xl leading-none text-white shadow-lg hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick add idea"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
            }}
            className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-xl dark:bg-neutral-900"
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={4}
              placeholder="Jot an idea…"
              aria-label="Idea"
              className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
            />
            {projectId && (
              <label className="flex items-center gap-2 text-xs text-neutral-500">
                <input
                  type="checkbox"
                  checked={toProject}
                  onChange={(e) => setToProject(e.target.checked)}
                />
                Save to this project (otherwise General ideas)
              </label>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-neutral-500">
                Enter to save · Shift+Enter for a new line
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md px-3 py-1.5 text-sm text-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isPending || !value.trim()}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
