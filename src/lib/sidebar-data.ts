import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type SidebarEpisode = {
  id: string;
  title: string;
  episodeTitle: string | null;
  episodeNumber: number | null;
};

export type SidebarSeason = {
  id: string;
  number: number;
  title: string | null;
  episodes: SidebarEpisode[];
};

export type SidebarSeries = {
  id: string;
  title: string;
  seasons: SidebarSeason[];
};

export type SidebarData = {
  series: SidebarSeries[];
  scripts: { id: string; title: string }[];
  inboxCount: number;
};

export const getSidebarData = cache(async (userId: string): Promise<SidebarData> => {
  const [series, scripts, inboxCount] = await Promise.all([
    prisma.series.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        seasons: {
          orderBy: { number: "asc" },
          select: {
            id: true,
            number: true,
            title: true,
            episodes: {
              where: { status: "ACTIVE" },
              orderBy: { episodeNumber: "asc" },
              select: { id: true, title: true, episodeTitle: true, episodeNumber: true },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { userId, seasonId: null, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.idea.count({
      where: { userId, projectId: null, seriesId: null, seasonId: null },
    }),
  ]);
  return { series, scripts, inboxCount };
});
