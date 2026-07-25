import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { QuickAddIdea } from "@/components/quick-add-idea";
import { IdeaItem } from "@/components/idea-item";

export default async function ProjectIdeasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProjectOrNotFound(id);

  const ideas = await prisma.idea.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <QuickAddIdea projectId={id} />
      {ideas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No ideas linked to this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {ideas.map((idea) => (
            <IdeaItem
              key={idea.id}
              id={idea.id}
              content={idea.content}
              createdAt={idea.createdAt.toLocaleDateString()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
