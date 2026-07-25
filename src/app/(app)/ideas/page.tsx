import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { QuickAddIdea } from "@/components/quick-add-idea";
import { IdeaItem } from "@/components/idea-item";
import { SearchBox } from "@/components/search-box";

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const userId = await requireUserId();
  const { q } = await searchParams;

  const [ideas, projects] = await Promise.all([
    prisma.idea.findMany({
      where: {
        userId,
        projectId: null,
        ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">General ideas</h1>
        <p className="text-sm text-neutral-500">
          Loose lines, premises, images — not tied to any project.
        </p>
      </div>

      <QuickAddIdea />

      <SearchBox action="/ideas" defaultValue={q} />

      {ideas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {q ? "No ideas match your search." : "No ideas yet — capture one above."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {ideas.map((idea) => (
            <IdeaItem
              key={idea.id}
              id={idea.id}
              content={idea.content}
              createdAt={idea.createdAt.toLocaleDateString()}
              projects={projects}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
