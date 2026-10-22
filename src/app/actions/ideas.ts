"use server";

import { revalidatePath } from "next/cache";
import { revalidateShell } from "@/lib/revalidate-shell";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { FORMAT_TEMPLATES } from "@/lib/format-templates";
import { createEmptyContent } from "@/lib/draft-content";
import { deriveIdeaTitle, normalizeTags, parseIdeaInput } from "@/lib/idea-text";
import type { IdeaStatus } from "@/generated/prisma/client";

export async function createIdea(content: string, projectId: string | null) {
  const userId = await requireUserId();
  const { content: trimmed, tags } = parseIdeaInput(content);
  if (!trimmed) return;

  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!owned) throw new Error("Not found");
  }

  await prisma.idea.create({
    data: { userId, projectId, content: trimmed, tags },
  });

  revalidateShell();
  revalidatePath("/ideas");
  if (projectId) revalidatePath(`/projects/${projectId}/ideas`);
}

export async function deleteIdea(ideaId: string) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) return;

  await prisma.idea.delete({ where: { id: ideaId } });

  revalidateShell();
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

  const { content: trimmed, tags } = parseIdeaInput(content);
  if (!trimmed) return;

  await prisma.idea.create({
    data: {
      userId,
      seriesId,
      seasonId: scope?.seasonId || null,
      projectId: scope?.projectId || null,
      content: trimmed,
      tags,
    },
  });

  revalidateShell();
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

  revalidateShell();
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

  revalidateShell();
  revalidatePath("/ideas");
  revalidatePath(`/projects/${projectId}/ideas`);
}

function revalidateIdeaPaths(idea: {
  projectId: string | null;
  seriesId: string | null;
  seasonId: string | null;
}) {
  revalidateShell();
  revalidatePath("/ideas");
  revalidatePath("/dashboard");
  if (idea.projectId) revalidatePath(`/projects/${idea.projectId}/ideas`);
  if (idea.seriesId) revalidatePath(`/series/${idea.seriesId}/ideas`);
  if (idea.seriesId && idea.seasonId) {
    revalidatePath(`/series/${idea.seriesId}/seasons/${idea.seasonId}`);
  }
}

export async function updateIdea(
  ideaId: string,
  data: {
    title?: string | null;
    content?: string;
    tags?: string[];
    status?: IdeaStatus;
  }
) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) throw new Error("Not found");

  const update: {
    title?: string | null;
    content?: string;
    tags?: string[];
    status?: IdeaStatus;
  } = {};
  if (data.title !== undefined) update.title = data.title?.trim() || null;
  if (data.content !== undefined) {
    const content = data.content.trim();
    if (!content) throw new Error("An idea can't be empty");
    update.content = content;
  }
  if (data.tags !== undefined) update.tags = normalizeTags(data.tags);
  if (data.status !== undefined) update.status = data.status;

  await prisma.idea.update({ where: { id: ideaId }, data: update });
  revalidateIdeaPaths(idea);
}

// Turns an idea into a brand-new script: the idea's title and text become the
// project's title and logline, and the idea stays behind, marked Promoted and
// linked to what it became.
export async function developIdeaIntoScript(ideaId: string, formatTemplate: string) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) throw new Error("Not found");

  const template = FORMAT_TEMPLATES.find((t) => t.id === formatTemplate);
  if (!template) throw new Error("Unknown format");

  const title = (idea.title?.trim() || deriveIdeaTitle(idea.content)).slice(0, 200);
  const project = await prisma.project.create({
    data: {
      userId,
      title,
      formatTemplate: template.id,
      writingMode: template.writingMode,
      logline: idea.content.slice(0, 1000),
      draft: { create: { content: createEmptyContent(template.writingMode) } },
    },
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: "PROMOTED", promotedProjectId: project.id },
  });

  revalidateIdeaPaths(idea);
  redirect(`/projects/${project.id}`);
}

export async function developIdeaIntoSeries(ideaId: string) {
  const userId = await requireUserId();
  const idea = await prisma.idea.findFirst({ where: { id: ideaId, userId } });
  if (!idea) throw new Error("Not found");

  const title = (idea.title?.trim() || deriveIdeaTitle(idea.content)).slice(0, 200);
  const series = await prisma.series.create({
    data: { userId, title, premise: idea.content.slice(0, 2000) },
  });

  await prisma.idea.update({
    where: { id: ideaId },
    data: { status: "PROMOTED", promotedSeriesId: series.id },
  });

  revalidateIdeaPaths(idea);
  redirect(`/series/${series.id}`);
}
