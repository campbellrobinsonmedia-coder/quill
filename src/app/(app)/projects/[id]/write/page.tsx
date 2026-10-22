import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { createEmptyContent, type DraftContent, type ScreenplayContent } from "@/lib/draft-content";
import { WriteEditor } from "@/components/editor/write-editor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Write" };

export default async function WritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectOrNotFound(id);

  const season = project.seasonId
    ? await prisma.season.findUnique({
        where: { id: project.seasonId },
        select: { seriesId: true },
      })
    : null;

  let draft = await prisma.draft.findUnique({ where: { projectId: id } });
  if (!draft) {
    draft = await prisma.draft.create({
      data: {
        projectId: id,
        content: createEmptyContent(project.writingMode),
      },
    });
  }

  const [versions, characters, worldNotes, comments, lastLockedVersion, outlineCards] = await Promise.all([
    prisma.draftVersion.findMany({
      where: { draftId: draft.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, wordCount: true, label: true, createdAt: true },
    }),
    prisma.character.findMany({
      where: season
        ? { OR: [{ projectId: id }, { seriesId: season.seriesId }] }
        : { projectId: id },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.worldNote.findMany({
      where: season
        ? { OR: [{ projectId: id }, { seriesId: season.seriesId }] }
        : { projectId: id },
      select: { title: true },
    }),
    prisma.draftComment.findMany({
      where: { draftId: draft.id },
      select: { id: true, elementId: true, text: true, resolved: true },
    }),
    draft.lastLockedVersionId
      ? prisma.draftVersion.findUnique({
          where: { id: draft.lastLockedVersionId },
          select: { content: true, revisionColor: true },
        })
      : null,
    prisma.outlineCard.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        linkedSceneId: true,
        beat: { select: { title: true } },
      },
    }),
  ]);

  return (
    <WriteEditor
      projectId={id}
      initialContent={draft.content as unknown as DraftContent}
      initialRevision={draft.revision}
      initialVersions={versions}
      characterNames={characters.map((c) => c.name)}
      locationSuggestions={worldNotes.map((w) => w.title)}
      initialSceneNumbersLocked={draft.sceneNumbersLocked}
      initialRevisionBaseline={
        lastLockedVersion ? (lastLockedVersion.content as unknown as ScreenplayContent) : null
      }
      initialRevisionColor={lastLockedVersion?.revisionColor ?? null}
      initialComments={comments}
      outlineCards={outlineCards.map((c) => ({
        id: c.id,
        title: c.title,
        linkedSceneId: c.linkedSceneId,
        beatTitle: c.beat?.title ?? null,
      }))}
    />
  );
}
