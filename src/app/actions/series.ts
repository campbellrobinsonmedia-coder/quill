"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSeriesSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  format: z.string().max(100).optional(),
  premise: z.string().max(2000).optional(),
});

export async function createSeries(formData: FormData) {
  const userId = await requireUserId();

  const parsed = createSeriesSchema.safeParse({
    title: formData.get("title"),
    format: formData.get("format") || undefined,
    premise: formData.get("premise") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid series");
  }

  const series = await prisma.series.create({
    data: {
      userId,
      title: parsed.data.title,
      format: parsed.data.format,
      premise: parsed.data.premise,
    },
  });

  revalidatePath("/series");
  redirect(`/series/${series.id}`);
}

export async function updateSeriesMeta(
  seriesId: string,
  data: { title?: string; format?: string | null; premise?: string | null }
) {
  const userId = await requireUserId();
  await prisma.series.updateMany({
    where: { id: seriesId, userId },
    data,
  });
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/series");
}

export async function createSeason(seriesId: string, title?: string) {
  const userId = await requireUserId();
  const series = await prisma.series.findFirst({
    where: { id: seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Not found");

  const last = await prisma.season.findFirst({
    where: { seriesId },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  await prisma.season.create({
    data: {
      seriesId,
      number: (last?.number ?? 0) + 1,
      title: title?.trim() || null,
    },
  });

  revalidatePath(`/series/${seriesId}`);
}
