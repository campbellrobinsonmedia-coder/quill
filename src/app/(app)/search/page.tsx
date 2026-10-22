import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { DraftContent } from "@/lib/draft-content";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search" };

type Hit = { id: string; href: string; title: string; detail?: string; context?: string };

const MAX_PER_GROUP = 8;

function snippet(text: string, query: string, radius = 50): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ")}${end < text.length ? "…" : ""}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await requireUserId();
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const searching = q.length >= 2;

  const groups: { label: string; hits: Hit[] }[] = [];

  if (searching) {
    const contains = { contains: q, mode: "insensitive" as const };
    const owned = { OR: [{ project: { userId } }, { series: { userId } }] };

    const [projects, series, ideas, characters, worldNotes, beats, cards, drafts] =
      await Promise.all([
        prisma.project.findMany({
          where: {
            userId,
            OR: [
              { title: contains },
              { logline: contains },
              { episodeTitle: contains },
            ],
          },
          select: { id: true, title: true, logline: true, episodeTitle: true },
          take: MAX_PER_GROUP,
        }),
        prisma.series.findMany({
          where: { userId, OR: [{ title: contains }, { premise: contains }] },
          select: { id: true, title: true, premise: true },
          take: MAX_PER_GROUP,
        }),
        prisma.idea.findMany({
          where: { userId, content: contains },
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, projectId: true, seriesId: true, seasonId: true },
          take: MAX_PER_GROUP,
        }),
        prisma.character.findMany({
          where: {
            ...owned,
            OR: [
              { name: contains },
              { description: contains },
              { arcNotes: contains },
              { relationships: contains },
            ],
          },
          select: { id: true, name: true, description: true, projectId: true, seriesId: true },
          take: MAX_PER_GROUP,
        }),
        prisma.worldNote.findMany({
          where: {
            ...owned,
            OR: [{ title: contains }, { description: contains }, { category: contains }],
          },
          select: { id: true, title: true, description: true, projectId: true, seriesId: true },
          take: MAX_PER_GROUP,
        }),
        prisma.beat.findMany({
          where: {
            OR: [
              { series: { userId } },
              { season: { series: { userId } } },
              { project: { userId } },
            ],
            AND: [{ OR: [{ title: contains }, { summary: contains }] }],
          },
          select: {
            id: true,
            title: true,
            summary: true,
            projectId: true,
            seriesId: true,
            seasonId: true,
            season: { select: { seriesId: true } },
          },
          take: MAX_PER_GROUP,
        }),
        prisma.outlineCard.findMany({
          where: {
            project: { userId },
            OR: [
              { title: contains },
              { summary: contains },
              { turn: contains },
              { location: contains },
            ],
          },
          select: { id: true, title: true, summary: true, projectId: true },
          take: MAX_PER_GROUP,
        }),
        prisma.draft.findMany({
          where: { project: { userId } },
          select: { content: true, projectId: true, project: { select: { title: true } } },
        }),
      ]);

    const add = (label: string, hits: Hit[]) => {
      if (hits.length > 0) groups.push({ label, hits });
    };

    add(
      "Projects",
      projects.map((p) => ({
        id: p.id,
        href: `/projects/${p.id}`,
        title: p.episodeTitle ? `${p.title} — ${p.episodeTitle}` : p.title,
        detail: p.logline ?? undefined,
      }))
    );
    add(
      "Series",
      series.map((s) => ({
        id: s.id,
        href: `/series/${s.id}`,
        title: s.title,
        detail: s.premise ?? undefined,
      }))
    );
    add(
      "Script text",
      drafts
        .flatMap((d) => {
          const content = d.content as unknown as DraftContent;
          const text =
            content.type === "prose"
              ? content.text
              : content.elements.map((el) => el.text).join("\n");
          if (!text.toLowerCase().includes(q.toLowerCase())) return [];
          return [
            {
              id: d.projectId,
              href: `/projects/${d.projectId}/write`,
              title: d.project.title,
              context: snippet(text, q),
            },
          ];
        })
        .slice(0, MAX_PER_GROUP)
    );
    add(
      "Ideas",
      ideas.map((i) => ({
        id: i.id,
        href: i.projectId
          ? `/projects/${i.projectId}/ideas`
          : i.seriesId
            ? `/series/${i.seriesId}/ideas`
            : `/ideas?q=${encodeURIComponent(q)}`,
        title: snippet(i.content, q, 70),
      }))
    );
    add(
      "Characters",
      characters.map((c) => ({
        id: c.id,
        href: c.projectId
          ? `/projects/${c.projectId}/characters`
          : `/series/${c.seriesId}/bible`,
        title: c.name,
        detail: c.description ?? undefined,
      }))
    );
    add(
      "World notes",
      worldNotes.map((n) => ({
        id: n.id,
        href: n.projectId ? `/projects/${n.projectId}/world` : `/series/${n.seriesId}/bible`,
        title: n.title,
        detail: n.description ?? undefined,
      }))
    );
    add(
      "Beats",
      beats.map((b) => {
        const seriesId = b.seriesId ?? b.season?.seriesId;
        const href =
          b.seasonId && seriesId
            ? `/series/${seriesId}/seasons/${b.seasonId}`
            : b.seriesId
              ? `/series/${b.seriesId}`
              : `/projects/${b.projectId}`;
        return { id: b.id, href, title: b.title, detail: b.summary ?? undefined };
      })
    );
    add(
      "Outline cards",
      cards.map((c) => ({
        id: c.id,
        href: `/projects/${c.projectId}`,
        title: c.title,
        detail: c.summary ?? undefined,
      }))
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Search</h1>
        <p className="text-sm text-neutral-500">
          Projects, scripts, ideas, characters, world notes, beats, and outline
          cards.
        </p>
      </div>

      <form action="/search" method="GET" className="flex gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Search everything…"
          aria-label="Search everything"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Search
        </button>
      </form>

      {!searching ? (
        <p className="text-sm text-neutral-500">
          {q ? "Type at least 2 characters." : "Tip: press / anywhere to jump here."}
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing matches “{q}”.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-2">
            <h2 className="text-sm font-medium text-neutral-500">{group.label}</h2>
            <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {group.hits.map((hit) => (
                <li key={`${group.label}-${hit.id}`}>
                  <Link
                    href={hit.href}
                    className="block p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <p className="truncate text-sm font-medium">{hit.title}</p>
                    {hit.detail && (
                      <p className="line-clamp-2 text-sm text-neutral-500">{hit.detail}</p>
                    )}
                    {hit.context && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{hit.context}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
