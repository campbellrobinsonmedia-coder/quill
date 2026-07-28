"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

async function assertOwnsSeason(userId: string, seasonId: string) {
  const season = await prisma.season.findFirst({
    where: { id: seasonId, series: { userId } },
    select: { id: true, seriesId: true },
  });
  if (!season) throw new Error("Not found");
  return season;
}

export async function createSeasonBeat(seasonId: string, title: string) {
  const userId = await requireUserId();
  const season = await assertOwnsSeason(userId, seasonId);

  const trimmed = title.trim();
  if (!trimmed) return;

  const last = await prisma.seasonBeat.findFirst({
    where: { seasonId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.seasonBeat.create({
    data: {
      seasonId,
      title: trimmed,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidatePath(`/series/${season.seriesId}/seasons/${seasonId}`);
}

export async function updateSeasonBeat(
  beatId: string,
  data: { title?: string; summary?: string | null; projectId?: string | null }
) {
  const userId = await requireUserId();
  const beat = await prisma.seasonBeat.findFirst({
    where: { id: beatId },
    include: { season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } } },
  });
  if (!beat || beat.season.series.userId !== userId) throw new Error("Not found");

  if (data.projectId) {
    const episode = await prisma.project.findFirst({
      where: { id: data.projectId, seasonId: beat.season.id },
      select: { id: true },
    });
    if (!episode) throw new Error("Episode not found in this season");
  }

  await prisma.seasonBeat.update({ where: { id: beatId }, data });
  revalidatePath(`/series/${beat.season.seriesId}/seasons/${beat.season.id}`);
}

export async function deleteSeasonBeat(beatId: string) {
  const userId = await requireUserId();
  const beat = await prisma.seasonBeat.findFirst({
    where: { id: beatId },
    include: { season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } } },
  });
  if (!beat || beat.season.series.userId !== userId) throw new Error("Not found");

  await prisma.seasonBeat.delete({ where: { id: beatId } });
  revalidatePath(`/series/${beat.season.seriesId}/seasons/${beat.season.id}`);
}

export async function reorderSeasonBeats(seasonId: string, orderedIds: string[]) {
  const userId = await requireUserId();
  await assertOwnsSeason(userId, seasonId);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.seasonBeat.update({ where: { id }, data: { order: index } })
    )
  );
}
