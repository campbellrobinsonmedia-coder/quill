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
  if (idea.seriesId) revalidatePath(`/series/${idea.seriesId}/ideas`);
  if (idea.seriesId && idea.seasonId) {
    revalidatePath(`/series/${idea.seriesId}/seasons/${idea.seasonId}`);
  }
}

export async function createSeriesIdea(
  seriesId: string,
  content: string,
  scope?: { seasonId?: string | null; projectId?: string | null }
) {
  const userId = await requireUserId();
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Not found");

  const trimmed = content.trim();
  if (!trimmed) return;

  await prisma.idea.create({
    data: {
      userId,
      seriesId,
      seasonId: scope?.seasonId || null,
      projectId: scope?.projectId || null,
      content: trimmed,
    },
  });

  revalidatePath(`/series/${seriesId}/ideas`);
  if (scope?.seasonId) revalidatePath(`/series/${seriesId}/seasons/${scope.seasonId}`);
  if (scope?.projectId) revalidatePath(`/projects/${scope.projectId}/ideas`);
}

export async function updateIdeaScope(
  ideaId: string,
  scope: { seasonId?: string | null; projectId?: string | null }
) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea || !idea.seriesId) throw new Error("Not found");

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      seasonId: scope.seasonId || null,
      projectId: scope.projectId || null,
    },
  });

  revalidatePath(`/series/${idea.seriesId}/ideas`);
  if (idea.seasonId) revalidatePath(`/series/${idea.seriesId}/seasons/${idea.seasonId}`);
  if (scope.seasonId) revalidatePath(`/series/${idea.seriesId}/seasons/${scope.seasonId}`);
  if (idea.projectId) revalidatePath(`/projects/${idea.projectId}/ideas`);
  if (scope.projectId) revalidatePath(`/projects/${scope.projectId}/ideas`);
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
