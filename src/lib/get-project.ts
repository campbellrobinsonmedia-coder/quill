import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const getProjectOrNotFound = cache(async (projectId: string) => {
  const userId = await requireUserId();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) notFound();
  return project;
});
