import { getProjectOrNotFound } from "@/lib/get-project";
import { templateLabel } from "@/lib/format-templates";
import { ProjectTabNav } from "@/components/project-tab-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="px-6 py-4">
        <p className="text-xs text-neutral-500">
          {templateLabel(project.formatTemplate)}
        </p>
        <h1 className="text-xl font-semibold">{project.title}</h1>
        {project.logline && (
          <p className="mt-1 text-sm text-neutral-500">{project.logline}</p>
        )}
      </div>
      <ProjectTabNav projectId={id} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
