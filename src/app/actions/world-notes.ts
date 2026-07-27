"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function createWorldNote(projectId: string, title: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw new Error("Not found");

  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.worldNote.create({
    data: { projectId, title: trimmed },
  });

  revalidatePath(`/projects/${projectId}/world`);
  revalidatePath(`/projects/${projectId}/write`);
}

export async function updateWorldNote(
  noteId: string,
  data: { title?: string; category?: string | null; description?: string }
) {
  const userId = await requireUserId();
  const note = await prisma.worldNote.findFirst({
    where: { id: noteId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!note || note.project.userId !== userId) throw new Error("Not found");

  await prisma.worldNote.update({ where: { id: noteId }, data });
  revalidatePath(`/projects/${note.project.id}/world`);
  revalidatePath(`/projects/${note.project.id}/write`);
}

export async function deleteWorldNote(noteId: string) {
  const userId = await requireUserId();
  const note = await prisma.worldNote.findFirst({
    where: { id: noteId },
    include: { project: { select: { userId: true, id: true } } },
  });
  if (!note || note.project.userId !== userId) throw new Error("Not found");

  await prisma.worldNote.delete({ where: { id: noteId } });
  revalidatePath(`/projects/${note.project.id}/world`);
  revalidatePath(`/projects/${note.project.id}/write`);
}
