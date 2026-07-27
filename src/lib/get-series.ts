import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export const getSeriesOrNotFound = cache(async (seriesId: string) => {
  const userId = await requireUserId();
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
  });
  if (!series) notFound();
  return series;
});

export const getSeasonOrNotFound = cache(async (seasonId: string) => {
  const userId = await requireUserId();
  const season = await prisma.season.findFirst({
    where: { id: seasonId, series: { userId } },
    include: { series: true },
  });
  if (!season) notFound();
  return season;
});
