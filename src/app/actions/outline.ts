"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { normalizeOutlineOrder } from "@/lib/outline-order";
import type { Prisma } from "@/generated/prisma/client";

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Not found");
}

async function assertBeatInProject(beatId: string, projectId: string) {
  const beat = await prisma.beat.findFirst({
    where: { id: beatId, projectId, seasonId: null, seriesId: null },
    select: { id: true },
  });
  if (!beat) throw new Error("Beat not found in this project");
}

export async function createCard(projectId: string, title: string, beatId?: string | null) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);
  if (beatId) await assertBeatInProject(beatId, projectId);

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
      beatId: beatId || null,
      order: (last?.order ?? -1) + 1,
    },
  });

  await normalizeOutlineOrder(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCard(
  cardId: string,
  data: {
    title?: string;
    summary?: string;
    turn?: string | null;
    colorTag?: string | null;
    act?: string | null;
    location?: string | null;
    emotion?: string | null;
    storyThread?: string | null;
    linkedSceneId?: string | null;
    beatId?: string | null;
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
  if (rest.beatId) await assertBeatInProject(rest.beatId, card.project.id);

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

  if (data.beatId !== undefined) await normalizeOutlineOrder(card.project.id);
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
  await normalizeOutlineOrder(card.project.id);
  revalidatePath(`/projects/${card.project.id}`);
}

// Persists the whole Plan board in one go: beat order, which beat each scene
// sits under, and the scenes' order within it. Every id is checked against
// the project so a crafted request can't touch someone else's rows.
export async function saveOutlineLayout(
  projectId: string,
  layout: {
    beatIds: string[];
    columns: { beatId: string | null; cardIds: string[] }[];
  }
) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);

  const [beats, cards] = await Promise.all([
    prisma.beat.findMany({
      where: { projectId, seasonId: null, seriesId: null },
      select: { id: true },
    }),
    prisma.outlineCard.findMany({ where: { projectId }, select: { id: true } }),
  ]);
  const beatSet = new Set(beats.map((b) => b.id));
  const cardSet = new Set(cards.map((c) => c.id));

  if (layout.beatIds.some((id) => !beatSet.has(id))) throw new Error("Invalid beat");
  const seen = new Set<string>();
  for (const col of layout.columns) {
    if (col.beatId !== null && !beatSet.has(col.beatId)) throw new Error("Invalid beat");
    for (const id of col.cardIds) {
      if (!cardSet.has(id) || seen.has(id)) throw new Error("Invalid card");
      seen.add(id);
    }
  }

  const updates: Prisma.PrismaPromise<unknown>[] = layout.beatIds.map((id, index) =>
    prisma.beat.update({ where: { id }, data: { order: index } })
  );
  let position = 0;
  for (const col of layout.columns) {
    for (const id of col.cardIds) {
      updates.push(
        prisma.outlineCard.update({
          where: { id },
          data: { beatId: col.beatId, order: position++ },
        })
      );
    }
  }
  await prisma.$transaction(updates);

  revalidatePath(`/projects/${projectId}`);
}
