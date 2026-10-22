"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarData } from "@/lib/sidebar-data";

const LINK_BASE = "flex min-w-0 items-center rounded-md px-2 py-1.5 text-sm";
const LINK_IDLE =
  "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";
const LINK_ACTIVE =
  "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100";

function NavLink({
  href,
  active,
  indent = 0,
  children,
  trailing,
}: {
  href: string;
  active: boolean;
  indent?: 0 | 1 | 2;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const pad = indent === 0 ? "" : indent === 1 ? "ml-4" : "ml-8";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${LINK_BASE} ${pad} ${active ? LINK_ACTIVE : LINK_IDLE}`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function SidebarNav({ data }: { data: SidebarData }) {
  const pathname = usePathname();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // Which series/season the current page belongs to, so the tree opens to it.
  let activeSeriesId: string | null = null;
  let activeSeasonId: string | null = null;
  const seriesMatch = /^\/series\/([^/]+)/.exec(pathname);
  const seasonMatch = /^\/series\/[^/]+\/seasons\/([^/]+)/.exec(pathname);
  const projectMatch = /^\/projects\/([^/]+)/.exec(pathname);
  if (seriesMatch) activeSeriesId = seriesMatch[1];
  if (seasonMatch) activeSeasonId = seasonMatch[1];
  if (projectMatch) {
    for (const series of data.series) {
      for (const season of series.seasons) {
        if (season.episodes.some((e) => e.id === projectMatch[1])) {
          activeSeriesId = series.id;
          activeSeasonId = season.id;
        }
      }
    }
  }

  const isOpen = (id: string, defaultOpen: boolean) => toggled[id] ?? defaultOpen;
  const toggle = (id: string, current: boolean) =>
    setToggled((prev) => ({ ...prev, [id]: !current }));

  const sectionLabel = "px-2 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-neutral-500";

  return (
    <nav aria-label="Workspace" className="flex flex-col gap-0.5 p-3">
      <NavLink href="/dashboard" active={pathname === "/dashboard"}>
        Today
      </NavLink>
      <NavLink
        href="/ideas"
        active={pathname === "/ideas"}
        trailing={
          data.inboxCount > 0 ? (
            <span className="ml-2 rounded-full bg-neutral-200 px-1.5 text-xs tabular-nums text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
              {data.inboxCount}
            </span>
          ) : null
        }
      >
        Idea inbox
      </NavLink>
      <NavLink href="/search" active={pathname === "/search"}>
        Search
      </NavLink>

      <p className={sectionLabel}>Series</p>
      {data.series.length === 0 && (
        <p className="px-2 text-xs text-neutral-500">No series yet.</p>
      )}
      {data.series.map((series) => {
        const seriesOpen = isOpen(series.id, series.id === activeSeriesId);
        const seriesActive = pathname === `/series/${series.id}`;
        return (
          <div key={series.id}>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => toggle(series.id, seriesOpen)}
                aria-expanded={seriesOpen}
                aria-label={`${seriesOpen ? "Collapse" : "Expand"} ${series.title}`}
                className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Chevron open={seriesOpen} />
              </button>
              <div className="min-w-0 flex-1">
                <NavLink href={`/series/${series.id}`} active={seriesActive}>
                  {series.title}
                </NavLink>
              </div>
            </div>
            {seriesOpen &&
              series.seasons.map((season) => {
                const seasonOpen = isOpen(season.id, season.id === activeSeasonId);
                const seasonPath = `/series/${series.id}/seasons/${season.id}`;
                return (
                  <div key={season.id}>
                    <div className="ml-4 flex items-center">
                      <button
                        type="button"
                        onClick={() => toggle(season.id, seasonOpen)}
                        aria-expanded={seasonOpen}
                        aria-label={`${seasonOpen ? "Collapse" : "Expand"} season ${season.number}`}
                        className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Chevron open={seasonOpen} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <NavLink href={seasonPath} active={pathname.startsWith(seasonPath)}>
                          Season {season.number}
                          {season.title ? `: ${season.title}` : ""}
                        </NavLink>
                      </div>
                    </div>
                    {seasonOpen &&
                      season.episodes.map((ep) => (
                        <NavLink
                          key={ep.id}
                          href={`/projects/${ep.id}`}
                          active={pathname.startsWith(`/projects/${ep.id}`)}
                          indent={2}
                        >
                          {ep.episodeNumber ? `${ep.episodeNumber}. ` : ""}
                          {ep.episodeTitle || ep.title}
                        </NavLink>
                      ))}
                  </div>
                );
              })}
          </div>
        );
      })}

      <p className={sectionLabel}>Scripts</p>
      {data.scripts.length === 0 && (
        <p className="px-2 text-xs text-neutral-500">No standalone scripts yet.</p>
      )}
      {data.scripts.map((script) => (
        <NavLink
          key={script.id}
          href={`/projects/${script.id}`}
          active={pathname.startsWith(`/projects/${script.id}`)}
        >
          {script.title}
        </NavLink>
      ))}
    </nav>
  );
}
