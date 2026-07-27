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
        isEpisode={Boolean(project.seasonId)}
        initial={{
          title: project.title,
          logline: project.logline,
          titlePageAuthor: project.titlePageAuthor,
          titlePageContact: project.titlePageContact,
          titlePageBasedOn: project.titlePageBasedOn,
          episodeTitle: project.episodeTitle,
          storyBy: project.storyBy,
          teleplayBy: project.teleplayBy,
        }}
      />
    </div>
  );
}
