"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { FORMAT_TEMPLATES } from "@/lib/format-templates";
import { createEmptyContent } from "@/lib/draft-content";

const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  formatTemplate: z.enum(
    FORMAT_TEMPLATES.map((t) => t.id) as [string, ...string[]]
  ),
  logline: z.string().max(1000).optional(),
});

export async function createProject(formData: FormData) {
  const userId = await requireUserId();

  const parsed = createProjectSchema.safeParse({
    title: formData.get("title"),
    formatTemplate: formData.get("formatTemplate"),
    logline: formData.get("logline") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid project");
  }

  const template = FORMAT_TEMPLATES.find(
    (t) => t.id === parsed.data.formatTemplate
  )!;

  const project = await prisma.project.create({
    data: {
      userId,
      title: parsed.data.title,
      formatTemplate: template.id,
      writingMode: template.writingMode,
      logline: parsed.data.logline,
      draft: {
        create: {
          content: createEmptyContent(template.writingMode),
        },
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

const createEpisodeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  formatTemplate: z.enum(
    FORMAT_TEMPLATES.map((t) => t.id) as [string, ...string[]]
  ),
  logline: z.string().max(1000).optional(),
});

export async function createEpisode(seasonId: string, formData: FormData) {
  const userId = await requireUserId();

  const season = await prisma.season.findFirst({
    where: { id: seasonId, series: { userId } },
    select: { id: true, seriesId: true },
  });
  if (!season) throw new Error("Not found");

  const parsed = createEpisodeSchema.safeParse({
    title: formData.get("title"),
    formatTemplate: formData.get("formatTemplate"),
    logline: formData.get("logline") || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid episode");
  }

  const template = FORMAT_TEMPLATES.find(
    (t) => t.id === parsed.data.formatTemplate
  )!;

  const last = await prisma.project.findFirst({
    where: { seasonId },
    orderBy: { episodeNumber: "desc" },
    select: { episodeNumber: true },
  });

  const project = await prisma.project.create({
    data: {
      userId,
      title: parsed.data.title,
      formatTemplate: template.id,
      writingMode: template.writingMode,
      logline: parsed.data.logline,
      seasonId,
      episodeNumber: (last?.episodeNumber ?? 0) + 1,
      draft: {
        create: {
          content: createEmptyContent(template.writingMode),
        },
      },
    },
  });

  revalidatePath(`/series/${season.seriesId}`);
  revalidatePath(`/series/${season.seriesId}/seasons/${seasonId}`);
  redirect(`/projects/${project.id}`);
}

export async function setProjectStatus(
  projectId: string,
  status: "ACTIVE" | "ARCHIVED"
) {
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { status },
  });
  revalidatePath("/dashboard");
}

export async function deleteProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { status: true, seasonId: true },
  });
  if (!project || project.status !== "ARCHIVED") {
    throw new Error("Only archived projects can be deleted");
  }

  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/dashboard");
}

export async function updateProjectMeta(
  projectId: string,
  data: {
    title?: string;
    logline?: string;
    titlePageAuthor?: string | null;
    titlePageContact?: string | null;
    titlePageBasedOn?: string | null;
    episodeTitle?: string | null;
    storyBy?: string | null;
    teleplayBy?: string | null;
  }
) {
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data,
  });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/write`);
  revalidatePath(`/projects/${projectId}/settings`);
}

export async function getOwnedProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Not found");
  return project;
}
