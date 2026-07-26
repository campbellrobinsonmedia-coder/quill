import { getProjectOrNotFound } from "@/lib/get-project";
import { ProjectSettingsForm } from "@/components/project-settings-form";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <ProjectSettingsForm
        projectId={id}
        initial={{
          title: project.title,
          logline: project.logline,
          titlePageAuthor: project.titlePageAuthor,
          titlePageContact: project.titlePageContact,
          titlePageBasedOn: project.titlePageBasedOn,
        }}
      />
    </div>
  );
}
