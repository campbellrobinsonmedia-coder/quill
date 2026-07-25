import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { templateLabel } from "@/lib/format-templates";
import { setProjectStatus } from "@/app/actions/projects";
import { NewProjectForm } from "./new-project-form";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const active = projects.filter((p) => p.status === "ACTIVE");
  const archived = projects.filter((p) => p.status === "ARCHIVED");

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-10 p-6">
      <section className="space-y-4">
        <h1 className="text-lg font-semibold">New project</h1>
        <NewProjectForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Projects ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No projects yet — start one above.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {active.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/projects/${project.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.title}</p>
                  <p className="truncate text-sm text-neutral-500">
                    {templateLabel(project.formatTemplate)}
                    {project.logline ? ` · ${project.logline}` : ""}
                  </p>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await setProjectStatus(project.id, "ARCHIVED");
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
            {archived.map((project) => (
              <li key={project.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 opacity-60">
                  <p className="truncate font-medium">{project.title}</p>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await setProjectStatus(project.id, "ACTIVE");
                  }}
                >
                  <button
                    type="submit"
                    className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Restore
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
