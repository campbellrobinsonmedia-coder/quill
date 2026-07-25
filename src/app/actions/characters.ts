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
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!character || character.project.userId !== userId) {
    throw new Error("Not found");
  }

  await prisma.character.update({ where: { id: characterId }, data });
  revalidatePath(`/projects/${character.project.id}/characters`);
}

export async function deleteCharacter(characterId: string) {
  const userId = await requireUserId();
  const character = await prisma.character.findFirst({
    where: { id: characterId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!character || character.project.userId !== userId) {
    throw new Error("Not found");
  }

  await prisma.character.delete({ where: { id: characterId } });
  revalidatePath(`/projects/${character.project.id}/characters`);
}
