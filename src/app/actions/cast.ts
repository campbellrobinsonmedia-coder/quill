"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { nameKey, titleCaseName } from "@/lib/cast";

const MAX_NAMES = 100;

async function resolveScope(userId: string, projectId: string, target: "project" | "series") {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, season: { select: { seriesId: true, series: { select: { userId: true } } } } },
  });
  if (!project) throw new Error("Not found");

  if (target === "series") {
    const season = project.season;
    if (!season || season.series.userId !== userId) {
      throw new Error("This script isn't part of a series");
    }
    return { projectId: null, seriesId: season.seriesId, knownSeriesId: season.seriesId };
  }
  return {
    projectId: project.id,
    seriesId: null,
    knownSeriesId: project.season?.seriesId ?? null,
  };
}

function revalidateCast(projectId: string, seriesId: string | null) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/characters`);
  revalidatePath(`/projects/${projectId}/world`);
  revalidatePath(`/projects/${projectId}/write`);
  if (seriesId) revalidatePath(`/series/${seriesId}/bible`);
}

// Saves character cues from the script as characters. Names that already
// exist on the script or its series are skipped.
export async function addCastFromScript(
  projectId: string,
  names: string[],
  target: "project" | "series" = "project"
) {
  const userId = await requireUserId();
  const scope = await resolveScope(userId, projectId, target);

  const existing = await prisma.character.findMany({
    where: {
      OR: [
        { projectId },
        ...(scope.knownSeriesId ? [{ seriesId: scope.knownSeriesId }] : []),
      ],
    },
    select: { name: true },
  });
  const known = new Set(existing.map((c) => nameKey(c.name)));

  const fresh: string[] = [];
  for (const raw of names.slice(0, MAX_NAMES)) {
    const key = nameKey(raw);
    if (!key || known.has(key)) continue;
    known.add(key);
    fresh.push(titleCaseName(key));
  }
  if (fresh.length === 0) return { created: 0 };

  await prisma.character.createMany({
    data: fresh.map((name) => ({
      name,
      projectId: scope.projectId,
      seriesId: scope.seriesId,
    })),
  });

  revalidateCast(projectId, scope.knownSeriesId);
  return { created: fresh.length };
}

// Saves scene-heading locations from the script as "Location" world notes.
export async function addLocationsFromScript(
  projectId: string,
  names: string[],
  target: "project" | "series" = "project"
) {
  const userId = await requireUserId();
  const scope = await resolveScope(userId, projectId, target);

  const existing = await prisma.worldNote.findMany({
    where: {
      OR: [
        { projectId },
        ...(scope.knownSeriesId ? [{ seriesId: scope.knownSeriesId }] : []),
      ],
    },
    select: { title: true },
  });
  const known = new Set(existing.map((n) => nameKey(n.title)));

  const fresh: string[] = [];
  for (const raw of names.slice(0, MAX_NAMES)) {
    const key = nameKey(raw);
    if (!key || key === "(UNSPECIFIED)" || known.has(key)) continue;
    known.add(key);
    fresh.push(titleCaseName(key));
  }
  if (fresh.length === 0) return { created: 0 };

  await prisma.worldNote.createMany({
    data: fresh.map((title) => ({
      title,
      category: "Location",
      projectId: scope.projectId,
      seriesId: scope.seriesId,
    })),
  });

  revalidateCast(projectId, scope.knownSeriesId);
  return { created: fresh.length };
}
