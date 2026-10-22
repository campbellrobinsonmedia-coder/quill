import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { QuickAddIdea } from "@/components/quick-add-idea";
import { IdeaItem } from "@/components/idea-item";
import { SearchBox } from "@/components/search-box";
import { EmptyState } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Idea inbox" };

type StatusFilter = "active" | "promoted" | "archived" | "all";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "promoted", label: "Promoted" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
];

const CHIP =
  "shrink-0 rounded-full border px-3 py-1 text-xs";
const CHIP_IDLE =
  "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900";
const CHIP_ACTIVE =
  "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tag?: string; scope?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const tag = params.tag?.trim().toLowerCase() || undefined;
  const status: StatusFilter = STATUS_FILTERS.some((s) => s.id === params.status)
    ? (params.status as StatusFilter)
    : "active";
  const scope = params.scope === "all" ? "all" : "inbox";

  const scopeWhere: Prisma.IdeaWhereInput =
    scope === "all" ? {} : { projectId: null, seriesId: null, seasonId: null };

  const statusWhere: Prisma.IdeaWhereInput =
    status === "promoted"
      ? { status: "PROMOTED" }
      : status === "archived"
        ? { status: "ARCHIVED" }
        : status === "all"
          ? {}
          : { status: { in: ["SPARK", "DEVELOPING"] } };

  const [ideas, projects, tagRows, statusCounts] = await Promise.all([
    prisma.idea.findMany({
      where: {
        userId,
        ...scopeWhere,
        ...statusWhere,
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q
          ? {
              OR: [
                { content: { contains: q, mode: "insensitive" } },
                { title: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, title: true } },
        series: { select: { id: true, title: true } },
        season: { select: { id: true, number: true, title: true } },
        promotedProject: { select: { id: true, title: true } },
        promotedSeries: { select: { id: true, title: true } },
      },
    }),
    prisma.project.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.idea.findMany({
      where: { userId, ...scopeWhere },
      select: { tags: true },
    }),
    prisma.idea.groupBy({
      by: ["status"],
      where: { userId, ...scopeWhere },
      _count: { _all: true },
    }),
  ]);

  const allTags = Array.from(
    tagRows.reduce((acc, row) => {
      for (const t of row.tags) acc.set(t, (acc.get(t) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const counts = new Map(statusCounts.map((c) => [c.status, c._count._all]));
  const activeCount = (counts.get("SPARK") ?? 0) + (counts.get("DEVELOPING") ?? 0);
  const filterCount: Record<StatusFilter, number> = {
    active: activeCount,
    promoted: counts.get("PROMOTED") ?? 0,
    archived: counts.get("ARCHIVED") ?? 0,
    all: activeCount + (counts.get("PROMOTED") ?? 0) + (counts.get("ARCHIVED") ?? 0),
  };

  function href(next: { status?: StatusFilter; tag?: string | null; scope?: string }) {
    const sp = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextScope = next.scope ?? scope;
    const nextTag = next.tag === undefined ? tag : next.tag;
    if (nextStatus !== "active") sp.set("status", nextStatus);
    if (nextScope !== "inbox") sp.set("scope", nextScope);
    if (nextTag) sp.set("tag", nextTag);
    if (q) sp.set("q", q);
    const qs = sp.toString();
    return qs ? `/ideas?${qs}` : "/ideas";
  }

  const filtered = Boolean(q || tag || status !== "active");

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">
          {scope === "all" ? "All ideas" : "Idea inbox"}
        </h1>
        <p className="text-sm text-neutral-500">
          {scope === "all"
            ? "Every idea, including the ones filed under a script or series."
            : "Loose lines, premises, images — not filed under any project. Add #tags as you type."}
        </p>
      </div>

      <QuickAddIdea />

      <SearchBox action="/ideas" defaultValue={q} />

      <div className="space-y-2">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={href({ status: f.id })}
              aria-current={status === f.id ? "true" : undefined}
              className={`${CHIP} ${status === f.id ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {f.label} {filterCount[f.id]}
            </Link>
          ))}
          <span aria-hidden className="mx-1 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          <Link
            href={href({ scope: scope === "all" ? "inbox" : "all" })}
            className={`${CHIP} ${scope === "all" ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            Include filed ideas
          </Link>
        </div>
        {allTags.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allTags.slice(0, 20).map(([t, n]) => (
              <Link
                key={t}
                href={href({ tag: tag === t ? null : t })}
                aria-current={tag === t ? "true" : undefined}
                className={`${CHIP} ${tag === t ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                #{t} {n}
              </Link>
            ))}
          </div>
        )}
      </div>

      {ideas.length === 0 ? (
        <EmptyState
          message={
            filtered
              ? "No ideas match these filters."
              : "No ideas yet — capture one above, or press i anywhere."
          }
          actionHref={filtered ? "/ideas" : undefined}
          actionLabel={filtered ? "Clear filters" : undefined}
        />
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {ideas.map((idea) => {
            let scopeLabel: string | undefined;
            let scopeHref: string | undefined;
            if (idea.project) {
              scopeLabel = idea.project.title;
              scopeHref = `/projects/${idea.project.id}/ideas`;
            } else if (idea.series && idea.season) {
              scopeLabel = `${idea.series.title} · Season ${idea.season.number}`;
              scopeHref = `/series/${idea.series.id}/seasons/${idea.season.id}`;
            } else if (idea.series) {
              scopeLabel = idea.series.title;
              scopeHref = `/series/${idea.series.id}/ideas`;
            }
            const promotedTo = idea.promotedProject
              ? { href: `/projects/${idea.promotedProject.id}`, label: idea.promotedProject.title }
              : idea.promotedSeries
                ? { href: `/series/${idea.promotedSeries.id}`, label: idea.promotedSeries.title }
                : null;
            return (
              <IdeaItem
                key={idea.id}
                id={idea.id}
                title={idea.title}
                content={idea.content}
                tags={idea.tags}
                status={idea.status}
                createdAt={idea.createdAt.toLocaleDateString()}
                scopeLabel={scopeLabel}
                scopeHref={scopeHref}
                promotedTo={promotedTo}
                projects={scopeLabel ? undefined : projects}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
