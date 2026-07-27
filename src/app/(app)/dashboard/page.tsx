import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { templateLabel } from "@/lib/format-templates";
import { setProjectStatus } from "@/app/actions/projects";
import { setSeriesStatus } from "@/app/actions/series";
import { NewProjectForm } from "./new-project-form";
import { NewSeriesForm } from "../series/new-series-form";
import { DeleteProjectButton } from "./delete-project-button";
import { DeleteSeriesButton } from "./delete-series-button";

type ListItem = {
  kind: "script" | "series";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  status: "ACTIVE" | "ARCHIVED";
  updatedAt: Date;
};

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [projects, series] = await Promise.all([
    prisma.project.findMany({
      where: { userId, seasonId: null },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.series.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        seasons: { select: { _count: { select: { episodes: true } } } },
      },
    }),
  ]);

  const items: ListItem[] = [
    ...projects.map((p) => ({
      kind: "script" as const,
      id: p.id,
      href: `/projects/${p.id}`,
      title: p.title,
      subtitle: [templateLabel(p.formatTemplate), p.logline]
        .filter(Boolean)
        .join(" · "),
      status: p.status,
      updatedAt: p.updatedAt,
    })),
    ...series.map((s) => {
      const episodeCount = s.seasons.reduce(
        (sum, season) => sum + season._count.episodes,
        0
      );
      return {
        kind: "series" as const,
        id: s.id,
        href: `/series/${s.id}`,
        title: s.title,
        subtitle: `Series · ${s.seasons.length} season${
          s.seasons.length === 1 ? "" : "s"
        } · ${episodeCount} episode${episodeCount === 1 ? "" : "s"}`,
        status: s.status,
        updatedAt: s.updatedAt,
      };
    }),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const active = items.filter((i) => i.status === "ACTIVE");
  const archived = items.filter((i) => i.status === "ARCHIVED");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-10 p-6">
      <section className="space-y-4">
        <h1 className="text-lg font-semibold">New script</h1>
        <NewProjectForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">New series</h2>
        <NewSeriesForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Projects ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No projects yet — start a script or series above.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {active.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-4 p-4">
                <Link href={item.href} className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {item.kind === "series" && (
                      <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800">
                        Series
                      </span>
                    )}
                    {item.title}
                  </p>
                  <p className="truncate text-sm text-neutral-500">
                    {item.subtitle}
                  </p>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    if (item.kind === "series") {
                      await setSeriesStatus(item.id, "ARCHIVED");
                    } else {
                      await setProjectStatus(item.id, "ARCHIVED");
                    }
                  }}
                >
                  <button
                    type="submit"
                    className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Archive
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500">
            Archived ({archived.length})
          </h2>
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {archived.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-4 p-4">
                <Link href={item.href} className="min-w-0 flex-1 opacity-60">
                  <p className="truncate font-medium">
                    {item.kind === "series" && (
                      <span className="mr-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800">
                        Series
                      </span>
                    )}
                    {item.title}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <form
                    action={async () => {
                      "use server";
                      if (item.kind === "series") {
                        await setSeriesStatus(item.id, "ACTIVE");
                      } else {
                        await setProjectStatus(item.id, "ACTIVE");
                      }
                    }}
                  >
                    <button
                      type="submit"
                      className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      Restore
                    </button>
                  </form>
                  {item.kind === "series" ? (
                    <DeleteSeriesButton seriesId={item.id} title={item.title} />
                  ) : (
                    <DeleteProjectButton projectId={item.id} title={item.title} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
