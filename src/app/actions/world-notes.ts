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

export async function createSeriesWorldNote(seriesId: string, title: string) {
  const userId = await requireUserId();
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Not found");

  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.worldNote.create({
    data: { seriesId, title: trimmed },
  });

  revalidatePath(`/series/${seriesId}/bible`);
}

export async function updateWorldNote(
  noteId: string,
  data: { title?: string; category?: string | null; description?: string }
) {
  const userId = await requireUserId();
  const note = await prisma.worldNote.findFirst({
    where: { id: noteId },
    include: {
      project: { select: { userId: true, id: true } },
      series: { select: { userId: true, id: true } },
    },
  });
  const ownerId = note?.project?.userId ?? note?.series?.userId;
  if (!note || ownerId !== userId) throw new Error("Not found");

  await prisma.worldNote.update({ where: { id: noteId }, data });
  if (note.project) {
    revalidatePath(`/projects/${note.project.id}/world`);
    revalidatePath(`/projects/${note.project.id}/write`);
  }
  if (note.series) {
    revalidatePath(`/series/${note.series.id}/bible`);
  }
}

export async function deleteWorldNote(noteId: string) {
  const userId = await requireUserId();
  const note = await prisma.worldNote.findFirst({
    where: { id: noteId },
    include: {
      project: { select: { userId: true, id: true } },
      series: { select: { userId: true, id: true } },
    },
  });
  const ownerId = note?.project?.userId ?? note?.series?.userId;
  if (!note || ownerId !== userId) throw new Error("Not found");

  await prisma.worldNote.delete({ where: { id: noteId } });
  if (note.project) {
    revalidatePath(`/projects/${note.project.id}/world`);
    revalidatePath(`/projects/${note.project.id}/write`);
  }
  if (note.series) {
    revalidatePath(`/series/${note.series.id}/bible`);
  }
}
