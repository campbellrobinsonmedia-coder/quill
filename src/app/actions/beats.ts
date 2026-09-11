"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

async function assertOwnsSeries(userId: string, seriesId: string) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Not found");
}

async function assertOwnsSeason(userId: string, seasonId: string) {
  const season = await prisma.season.findFirst({
    where: { id: seasonId, series: { userId } },
    select: { id: true, seriesId: true },
  });
  if (!season) throw new Error("Not found");
  return season;
}

async function assertOwnsProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, seasonId: true },
  });
  if (!project) throw new Error("Not found");
  return project;
}

async function nextOrder(where: {
  seriesId?: string | null;
  seasonId?: string | null;
  projectId?: string | null;
}) {
  const last = await prisma.beat.findFirst({
    where,
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

function revalidateForBeatScope(scope: {
  seriesId?: string | null;
  seasonId?: string | null;
  seasonSeriesId?: string | null;
  projectId?: string | null;
}) {
  if (scope.seriesId) revalidatePath(`/series/${scope.seriesId}`);
  if (scope.seasonId && scope.seasonSeriesId) {
    revalidatePath(`/series/${scope.seasonSeriesId}/seasons/${scope.seasonId}`);
  }
  if (scope.projectId) revalidatePath(`/projects/${scope.projectId}`);
}

export async function createSeriesBeat(seriesId: string, title: string) {
  const userId = await requireUserId();
  await assertOwnsSeries(userId, seriesId);

  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.beat.create({
    data: {
      seriesId,
      title: trimmed,
      order: await nextOrder({ seriesId }),
    },
  });

  revalidatePath(`/series/${seriesId}`);
}

export async function createSeasonBeat(seasonId: string, title: string) {
  const userId = await requireUserId();
  const season = await assertOwnsSeason(userId, seasonId);

  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.beat.create({
    data: {
      seasonId,
      title: trimmed,
      order: await nextOrder({ seasonId }),
    },
  });

  revalidatePath(`/series/${season.seriesId}/seasons/${seasonId}`);
}

export async function createProjectBeat(projectId: string, title: string) {
  const userId = await requireUserId();
  await assertOwnsProject(userId, projectId);

  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.beat.create({
    data: {
      projectId,
      title: trimmed,
      order: await nextOrder({ projectId, seasonId: null, seriesId: null }),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

async function getOwnedBeat(userId: string, beatId: string) {
  const beat = await prisma.beat.findFirst({
    where: { id: beatId },
    include: {
      series: { select: { id: true, userId: true } },
      season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } },
      project: { select: { id: true, userId: true } },
    },
  });
  if (!beat) throw new Error("Not found");

  const owns =
    (beat.series && beat.series.userId === userId) ||
    (beat.season && beat.season.series.userId === userId) ||
    (beat.project && beat.project.userId === userId) ||
    // A season beat not yet assigned to an episode still needs an ownership
    // path; season already covers that case above.
    false;

  if (!owns) throw new Error("Not found");
  return beat;
}

export async function updateBeat(
  beatId: string,
  data: {
    title?: string;
    summary?: string | null;
    projectId?: string | null;
    linkedCardId?: string | null;
  }
) {
  const userId = await requireUserId();
  const beat = await getOwnedBeat(userId, beatId);

  // projectId on a season-scoped beat means "assign to this episode"; on a
  // beat that's already project-scoped (its own beat sheet), the owning
  // project can't be reassigned here.
  if (data.projectId !== undefined && data.projectId !== null && beat.seasonId) {
    const episode = await prisma.project.findFirst({
      where: { id: data.projectId, seasonId: beat.seasonId },
      select: { id: true },
    });
    if (!episode) throw new Error("Episode not found in this season");
  }

  const effectiveProjectId =
    data.projectId !== undefined ? data.projectId : beat.projectId;

  if (data.linkedCardId) {
    if (!effectiveProjectId) {
      throw new Error("Assign this beat to an episode before linking a scene card");
    }
    const card = await prisma.outlineCard.findFirst({
      where: { id: data.linkedCardId, projectId: effectiveProjectId },
      select: { id: true },
    });
    if (!card) throw new Error("Card not found in that project");
  }

  const updateData: {
    title?: string;
    summary?: string | null;
    linkedCardId?: string | null;
    projectId?: string | null;
  } = { title: data.title, summary: data.summary, linkedCardId: data.linkedCardId };
  // Only season-scoped beats support reassigning projectId (episode
  // assignment); a project-scoped beat's own projectId is fixed.
  if (beat.seasonId && data.projectId !== undefined) {
    updateData.projectId = data.projectId;
  }

  await prisma.beat.update({ where: { id: beatId }, data: updateData });

  revalidateForBeatScope({
    seriesId: beat.seriesId,
    seasonId: beat.seasonId,
    seasonSeriesId: beat.season?.seriesId,
    projectId: beat.projectId,
  });
}

export async function deleteBeat(beatId: string) {
  const userId = await requireUserId();
  const beat = await getOwnedBeat(userId, beatId);

  await prisma.beat.delete({ where: { id: beatId } });

  revalidateForBeatScope({
    seriesId: beat.seriesId,
    seasonId: beat.seasonId,
    seasonSeriesId: beat.season?.seriesId,
    projectId: beat.projectId,
  });
}

export async function reorderBeats(
  scope: { seriesId?: string; seasonId?: string; projectId?: string },
  orderedIds: string[]
) {
  const userId = await requireUserId();
  if (scope.seriesId) await assertOwnsSeries(userId, scope.seriesId);
  else if (scope.seasonId) await assertOwnsSeason(userId, scope.seasonId);
  else if (scope.projectId) await assertOwnsProject(userId, scope.projectId);
  else throw new Error("Invalid scope");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.beat.update({ where: { id }, data: { order: index } })
    )
  );
}
