"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Not found");
}

export async function createCard(projectId: string, title: string) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);

  const trimmed = title.trim();
  if (!trimmed) return;

  const last = await prisma.outlineCard.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.outlineCard.create({
    data: {
      projectId,
      title: trimmed,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function updateCard(
  cardId: string,
  data: {
    title?: string;
    summary?: string;
    colorTag?: string | null;
    act?: string | null;
    location?: string | null;
    emotion?: string | null;
    storyThread?: string | null;
    linkedSceneId?: string | null;
    characterIds?: string[];
  }
) {
  const userId = await requireUserId();
  const card = await prisma.outlineCard.findFirst({
    where: { id: cardId },
    include: {
      project: {
        select: { userId: true, id: true, season: { select: { seriesId: true } } },
      },
    },
  });
  if (!card || card.project.userId !== userId) throw new Error("Not found");

  const { characterIds, ...rest } = data;

  if (characterIds) {
    const seriesId = card.project.season?.seriesId;
    const owned = await prisma.character.findMany({
      where: {
        id: { in: characterIds },
        OR: seriesId
          ? [{ projectId: card.project.id }, { seriesId }]
          : [{ projectId: card.project.id }],
      },
      select: { id: true },
    });
    await prisma.outlineCard.update({
      where: { id: cardId },
      data: {
        ...rest,
        characters: { set: owned.map((c) => ({ id: c.id })) },
      },
    });
  } else {
    await prisma.outlineCard.update({ where: { id: cardId }, data: rest });
  }

  revalidatePath(`/projects/${card.project.id}`);
}

export async function deleteCard(cardId: string) {
  const userId = await requireUserId();
  const card = await prisma.outlineCard.findFirst({
    where: { id: cardId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!card || card.project.userId !== userId) throw new Error("Not found");

  await prisma.outlineCard.delete({ where: { id: cardId } });
  revalidatePath(`/projects/${card.project.id}`);
}

export async function reorderCards(projectId: string, orderedIds: string[]) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.outlineCard.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath(`/projects/${projectId}`);
}
