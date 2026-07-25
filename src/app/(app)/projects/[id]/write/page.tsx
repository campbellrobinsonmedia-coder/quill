import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { createEmptyContent, type DraftContent } from "@/lib/draft-content";
import { WriteEditor } from "@/components/editor/write-editor";

export default async function WritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  let draft = await prisma.draft.findUnique({ where: { projectId: id } });
  if (!draft) {
    draft = await prisma.draft.create({
      data: {
        projectId: id,
        content: createEmptyContent(project.writingMode),
      },
    });
  }

  const versions = await prisma.draftVersion.findMany({
    where: { draftId: draft.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, wordCount: true, label: true, createdAt: true },
  });

  return (
    <WriteEditor
      projectId={id}
      initialContent={draft.content as unknown as DraftContent}
      initialVersions={versions}
    />
  );
}
