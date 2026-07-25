"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { countWords, type DraftContent } from "@/lib/draft-content";
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
