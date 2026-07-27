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

export async function createCharacter(projectId: string, name: string) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);

  const trimmed = name.trim();
  if (!trimmed) return;

  await prisma.character.create({
    data: { projectId, name: trimmed },
  });

  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/write`);
}

export async function createSeriesCharacter(seriesId: string, name: string) {
  const userId = await requireUserId();
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Not found");

  const trimmed = name.trim();
  if (!trimmed) return;

  await prisma.character.create({
    data: { seriesId, name: trimmed },
  });

  revalidatePath(`/series/${seriesId}/bible`);
}

export async function updateCharacter(
  characterId: string,
  data: {
    name?: string;
    description?: string;
    arcNotes?: string;
    relationships?: string;
  }
) {
  const userId = await requireUserId();
  const character = await prisma.character.findFirst({
    where: { id: characterId },
    include: {
      project: { select: { userId: true, id: true } },
      series: { select: { userId: true, id: true } },
    },
  });
  const ownerId = character?.project?.userId ?? character?.series?.userId;
  if (!character || ownerId !== userId) {
    throw new Error("Not found");
  }

  await prisma.character.update({ where: { id: characterId }, data });
  if (character.project) {
    revalidatePath(`/projects/${character.project.id}/characters`);
    revalidatePath(`/projects/${character.project.id}`);
    revalidatePath(`/projects/${character.project.id}/write`);
  }
  if (character.series) {
    revalidatePath(`/series/${character.series.id}/bible`);
  }
}

export async function deleteCharacter(characterId: string) {
  const userId = await requireUserId();
  const character = await prisma.character.findFirst({
    where: { id: characterId },
    include: {
      project: { select: { userId: true, id: true } },
      series: { select: { userId: true, id: true } },
    },
  });
  const ownerId = character?.project?.userId ?? character?.series?.userId;
  if (!character || ownerId !== userId) {
    throw new Error("Not found");
  }

  await prisma.character.delete({ where: { id: characterId } });
  if (character.project) {
    revalidatePath(`/projects/${character.project.id}/characters`);
    revalidatePath(`/projects/${character.project.id}`);
    revalidatePath(`/projects/${character.project.id}/write`);
  }
  if (character.series) {
    revalidatePath(`/series/${character.series.id}/bible`);
  }
}
