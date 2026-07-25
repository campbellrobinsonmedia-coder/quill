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

export async function updateProjectMeta(
  projectId: string,
  data: { title?: string; logline?: string }
) {
  const userId = await requireUserId();
  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data,
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function getOwnedProject(projectId: string) {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) throw new Error("Not found");
  return project;
}
