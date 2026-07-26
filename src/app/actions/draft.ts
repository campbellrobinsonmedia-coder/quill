"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import {
  computeSceneNumbers,
  countWords,
  type DraftContent,
  type ScreenplayContent,
} from "@/lib/draft-content";
import { nextRevisionColor } from "@/lib/revision-colors";
import { fromFDX } from "@/lib/fdx";
import type { Prisma } from "@/generated/prisma/client";

async function getOwnedDraft(userId: string, projectId: string) {
  const draft = await prisma.draft.findFirst({
    where: { projectId, project: { userId } },
  });
  if (!draft) throw new Error("Not found");
  return draft;
}

export async function saveDraft(projectId: string, content: DraftContent) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: content as unknown as Prisma.InputJsonValue,
      wordCount: countWords(content),
    },
  });
}

export async function createVersionSnapshot(
  projectId: string,
  content: DraftContent,
  label?: string
) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  const version = await prisma.draftVersion.create({
    data: {
      draftId: draft.id,
      content: content as unknown as Prisma.InputJsonValue,
      wordCount: countWords(content),
      label: label ?? null,
    },
    select: { id: true, wordCount: true, label: true, createdAt: true },
  });

  revalidatePath(`/projects/${projectId}/write`);
  return version;
}

export async function listVersions(projectId: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  return prisma.draftVersion.findMany({
    where: { draftId: draft.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, wordCount: true, label: true, createdAt: true },
  });
}

export async function getVersionContent(projectId: string, versionId: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  const version = await prisma.draftVersion.findFirst({
    where: { id: versionId, draftId: draft.id },
  });
  if (!version) throw new Error("Not found");
  return version.content as unknown as DraftContent;
}

export async function restoreVersion(projectId: string, versionId: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  const version = await prisma.draftVersion.findFirst({
    where: { id: versionId, draftId: draft.id },
  });
  if (!version) throw new Error("Not found");

  // Snapshot current state before overwriting, so restoring is itself reversible.
  await prisma.draftVersion.create({
    data: {
      draftId: draft.id,
      content: draft.content as Prisma.InputJsonValue,
      wordCount: draft.wordCount,
      label: "Before restore",
    },
  });

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: version.content as Prisma.InputJsonValue,
      wordCount: version.wordCount,
    },
  });

  revalidatePath(`/projects/${projectId}/write`);
  return version.content as unknown as DraftContent;
}

// Freezes scene numbers and starts a new distribution revision: existing
// scene headings get an explicit, permanent number; the current content is
// snapshotted as the new "locked" baseline other lines get diffed against
// for the revision-mark asterisk; and the snapshot is tagged with the next
// color in the standard White/Blue/Pink/... sequence.
export async function lockDraft(projectId: string, content: DraftContent) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  let numberedContent = content;
  if (content.type === "screenplay") {
    const numbers = computeSceneNumbers(content.elements, draft.sceneNumbersLocked);
    const elements = content.elements.map((el) =>
      el.type === "scene_heading"
        ? { ...el, sceneNumber: numbers.get(el.id) ?? el.sceneNumber }
        : el
    );
    numberedContent = { type: "screenplay", elements } satisfies ScreenplayContent;
  }

  const lastVersion = draft.lastLockedVersionId
    ? await prisma.draftVersion.findUnique({
        where: { id: draft.lastLockedVersionId },
        select: { revisionColor: true },
      })
    : null;
  const revisionColor = nextRevisionColor(lastVersion?.revisionColor ?? null);

  const version = await prisma.draftVersion.create({
    data: {
      draftId: draft.id,
      content: numberedContent as unknown as Prisma.InputJsonValue,
      wordCount: countWords(numberedContent),
      label: `${revisionColor} revision`,
      revisionColor,
    },
    select: { id: true, wordCount: true, label: true, createdAt: true },
  });

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: numberedContent as unknown as Prisma.InputJsonValue,
      sceneNumbersLocked: true,
      lastLockedVersionId: version.id,
    },
  });

  revalidatePath(`/projects/${projectId}/write`);
  return { content: numberedContent, revisionColor, version };
}

export async function getRevisionBaseline(projectId: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);
  if (!draft.lastLockedVersionId) return null;

  const version = await prisma.draftVersion.findUnique({
    where: { id: draft.lastLockedVersionId },
    select: { content: true },
  });
  return version ? (version.content as unknown as DraftContent) : null;
}

export async function importFdx(projectId: string, xml: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  const imported = fromFDX(xml);

  // Snapshot current state before overwriting, so importing is reversible.
  await prisma.draftVersion.create({
    data: {
      draftId: draft.id,
      content: draft.content as Prisma.InputJsonValue,
      wordCount: draft.wordCount,
      label: "Before FDX import",
    },
  });

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: imported as unknown as Prisma.InputJsonValue,
      wordCount: countWords(imported),
    },
  });

  revalidatePath(`/projects/${projectId}/write`);
  return imported;
}

export async function createComment(
  projectId: string,
  elementId: string,
  text: string
) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  const trimmed = text.trim();
  if (!trimmed) return null;

  const comment = await prisma.draftComment.create({
    data: { draftId: draft.id, elementId, text: trimmed },
  });

  revalidatePath(`/projects/${projectId}/write`);
  return comment;
}

export async function updateComment(
  commentId: string,
  data: { text?: string; resolved?: boolean }
) {
  const userId = await requireUserId();
  const comment = await prisma.draftComment.findFirst({
    where: { id: commentId },
    include: { draft: { include: { project: { select: { userId: true, id: true } } } } },
  });
  if (!comment || comment.draft.project.userId !== userId) throw new Error("Not found");

  await prisma.draftComment.update({ where: { id: commentId }, data });
  revalidatePath(`/projects/${comment.draft.project.id}/write`);
}

export async function deleteComment(commentId: string) {
  const userId = await requireUserId();
  const comment = await prisma.draftComment.findFirst({
    where: { id: commentId },
    include: { draft: { include: { project: { select: { userId: true, id: true } } } } },
  });
  if (!comment || comment.draft.project.userId !== userId) throw new Error("Not found");

  await prisma.draftComment.delete({ where: { id: commentId } });
  revalidatePath(`/projects/${comment.draft.project.id}/write`);
}

export async function listComments(projectId: string) {
  const userId = await requireUserId();
  const draft = await getOwnedDraft(userId, projectId);

  return prisma.draftComment.findMany({
    where: { draftId: draft.id },
    orderBy: { createdAt: "asc" },
  });
}
