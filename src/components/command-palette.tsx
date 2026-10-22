"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { emitShellEvent, OPEN_PALETTE_EVENT, QUICK_CAPTURE_EVENT } from "@/lib/shell-events";
import type { SidebarData } from "@/lib/sidebar-data";

type PaletteItem = {
  id: string;
  label: string;
  hint: string;
  run: () => void;
};

const MAX_RESULTS = 8;

export function CommandPalette({ data }: { data: SidebarData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function openPalette() {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    returnFocusRef.current?.focus?.();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, openPalette);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: PaletteItem[] = [
      { id: "today", label: "Today", hint: "Go to", run: go("/dashboard") },
      { id: "inbox", label: "Idea inbox", hint: `${data.inboxCount} ideas`, run: go("/ideas") },
      { id: "search", label: "Search everything", hint: "Go to", run: go("/search") },
      { id: "settings", label: "Settings", hint: "Go to", run: go("/settings") },
      {
        id: "new-idea",
        label: "New idea…",
        hint: "Quick add",
        run: () => emitShellEvent(QUICK_CAPTURE_EVENT),
      },
    ];
    for (const s of data.scripts) {
      list.push({ id: `p-${s.id}`, label: s.title, hint: "Script", run: go(`/projects/${s.id}`) });
    }
    for (const series of data.series) {
      list.push({ id: `s-${series.id}`, label: series.title, hint: "Series", run: go(`/series/${series.id}`) });
      for (const season of series.seasons) {
        list.push({
          id: `se-${season.id}`,
          label: `Season ${season.number}${season.title ? `: ${season.title}` : ""}`,
          hint: series.title,
          run: go(`/series/${series.id}/seasons/${season.id}`),
        });
        for (const ep of season.episodes) {
          list.push({
            id: `ep-${ep.id}`,
            label: `Ep ${ep.episodeNumber ?? "?"}: ${ep.episodeTitle || ep.title}`,
            hint: `${series.title} · Season ${season.number}`,
            run: go(`/projects/${ep.id}`),
          });
        }
      }
    }
    return list;
  }, [data, router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? items
          .filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q))
          .sort((a, b) => {
            const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
            return aStarts - bStarts;
          })
      : items;
    const shown = matches.slice(0, MAX_RESULTS);
    if (q) {
      shown.push({
        id: "search-q",
        label: `Search everything for “${query.trim()}”`,
        hint: "Full-text",
        run: () => router.push(`/search?q=${encodeURIComponent(query.trim())}`),
      });
    }
    return shown;
  }, [items, query, router]);

  if (!open) return null;

  const activeIndex = Math.min(active, results.length - 1);

  function choose(item: PaletteItem) {
    setOpen(false);
    item.run();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const item = results[activeIndex];
            if (item) choose(item);
          }
        }}
        className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-neutral-900"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Jump to a script, series, episode… or type to search"
          aria-label="Jump to"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={results[activeIndex] ? `palette-${results[activeIndex].id}` : undefined}
          className="w-full border-b border-neutral-200 bg-transparent px-4 py-3 text-base outline-none dark:border-neutral-800"
        />
        <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto p-1">
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`palette-${item.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2 text-sm ${
                i === activeIndex ? "bg-neutral-100 dark:bg-neutral-800" : ""
              }`}
            >
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="shrink-0 text-xs text-neutral-500">{item.hint}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
