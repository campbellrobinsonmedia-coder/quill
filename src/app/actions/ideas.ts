"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function createIdea(content: string, projectId: string | null) {
  const userId = await requireUserId();
  const trimmed = content.trim();
  if (!trimmed) return;

  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error("Not found");
  }

  await prisma.idea.create({
    data: { userId, projectId, content: trimmed },
  });

  revalidatePath("/ideas");
  if (projectId) revalidatePath(`/projects/${projectId}/ideas`);
}

export async function deleteIdea(ideaId: string) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) return;

  await prisma.idea.delete({ where: { id: ideaId } });

  revalidatePath("/ideas");
  if (idea.projectId) revalidatePath(`/projects/${idea.projectId}/ideas`);
}

export async function promoteIdea(ideaId: string, projectId: string) {
  const userId = await requireUserId();
  const [idea, project] = await Promise.all([
    prisma.idea.findFirst({ where: { id: ideaId, userId } }),
    prisma.project.findFirst({ where: { id: projectId, userId } }),
  ]);
  if (!idea || !project) throw new Error("Not found");

  await prisma.idea.update({
    where: { id: ideaId },
    data: { projectId },
  });

  revalidatePath("/ideas");
  revalidatePath(`/projects/${projectId}/ideas`);
}
