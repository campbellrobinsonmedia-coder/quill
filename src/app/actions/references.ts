"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export type ReferenceScope =
  | { worldNoteId: string }
  | { seriesId: string }
  | { seasonId: string }
  | { beatId: string }
  | { characterId: string };

async function resolveScope(userId: string, scope: ReferenceScope) {
  if ("worldNoteId" in scope) {
    const note = await prisma.worldNote.findFirst({
      where: { id: scope.worldNoteId },
      select: {
        project: { select: { id: true, userId: true } },
        series: { select: { id: true, userId: true } },
      },
    });
    const ownerId = note?.project?.userId ?? note?.series?.userId;
    if (!note || ownerId !== userId) throw new Error("Not found");
    return {
      data: { worldNoteId: scope.worldNoteId },
      paths: [
        note.project ? `/projects/${note.project.id}/world` : null,
        note.series ? `/series/${note.series.id}/bible` : null,
      ].filter((p): p is string => Boolean(p)),
    };
  }

  if ("seriesId" in scope) {
    const series = await prisma.series.findFirst({
      where: { id: scope.seriesId, userId },
      select: { id: true },
    });
    if (!series) throw new Error("Not found");
    return {
      data: { seriesId: scope.seriesId },
      paths: [`/series/${scope.seriesId}`],
    };
  }

  if ("seasonId" in scope) {
    const season = await prisma.season.findFirst({
      where: { id: scope.seasonId, series: { userId } },
      select: { id: true, seriesId: true },
    });
    if (!season) throw new Error("Not found");
    return {
      data: { seasonId: scope.seasonId },
      paths: [`/series/${season.seriesId}/seasons/${scope.seasonId}`],
    };
  }

  if ("beatId" in scope) {
    const beat = await prisma.beat.findFirst({
      where: { id: scope.beatId },
      select: {
        series: { select: { id: true, userId: true } },
        season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } },
        project: { select: { id: true, userId: true } },
      },
    });
    const ownerId =
      beat?.series?.userId ?? beat?.season?.series.userId ?? beat?.project?.userId;
    if (!beat || ownerId !== userId) throw new Error("Not found");
    return {
      data: { beatId: scope.beatId },
      paths: [
        beat.series ? `/series/${beat.series.id}` : null,
        beat.season ? `/series/${beat.season.seriesId}/seasons/${beat.season.id}` : null,
        beat.project ? `/projects/${beat.project.id}` : null,
      ].filter((p): p is string => Boolean(p)),
    };
  }

  const character = await prisma.character.findFirst({
    where: { id: scope.characterId },
    select: {
      project: { select: { id: true, userId: true } },
      series: { select: { id: true, userId: true } },
    },
  });
  const ownerId = character?.project?.userId ?? character?.series?.userId;
  if (!character || ownerId !== userId) throw new Error("Not found");
  return {
    data: { characterId: scope.characterId },
    paths: [
      character.project ? `/projects/${character.project.id}/characters` : null,
      character.series ? `/series/${character.series.id}/bible` : null,
    ].filter((p): p is string => Boolean(p)),
  };
}

export async function createLinkReference(
  scope: ReferenceScope,
  data: { url: string; label: string; note?: string }
) {
  const userId = await requireUserId();
  const { data: scopeData, paths } = await resolveScope(userId, scope);

  const url = data.url.trim();
  const label = data.label.trim() || url;
  if (!url) throw new Error("A URL is required");
  try {
    new URL(url);
  } catch {
    throw new Error("Enter a valid URL");
  }

  await prisma.reference.create({
    data: {
      ...scopeData,
      kind: "LINK",
      url,
      label,
      note: data.note?.trim() || null,
    },
  });

  paths.forEach((p) => revalidatePath(p));
}

export async function createFileReference(scope: ReferenceScope, formData: FormData) {
  const userId = await requireUserId();
  const { data: scopeData, paths } = await resolveScope(userId, scope);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be under 20MB");
  }

  const label = String(formData.get("label") || "").trim() || file.name;
  const note = String(formData.get("note") || "").trim() || null;

  const blob = await put(`references/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
  });

  await prisma.reference.create({
    data: {
      ...scopeData,
      kind: "FILE",
      url: blob.url,
      label,
      note,
      fileType: file.type || null,
      fileSize: file.size,
    },
  });

  paths.forEach((p) => revalidatePath(p));
}

export async function deleteReference(referenceId: string) {
  const userId = await requireUserId();
  const ref = await prisma.reference.findFirst({
    where: { id: referenceId },
    include: {
      worldNote: {
        select: {
          project: { select: { id: true, userId: true } },
          series: { select: { id: true, userId: true } },
        },
      },
      series: { select: { id: true, userId: true } },
      season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } },
      beat: {
        select: {
          series: { select: { id: true, userId: true } },
          season: { select: { id: true, seriesId: true, series: { select: { userId: true } } } },
          project: { select: { id: true, userId: true } },
        },
      },
      character: {
        select: {
          project: { select: { id: true, userId: true } },
          series: { select: { id: true, userId: true } },
        },
      },
    },
  });
  if (!ref) return;

  const ownerId =
    ref.worldNote?.project?.userId ??
    ref.worldNote?.series?.userId ??
    ref.series?.userId ??
    ref.season?.series.userId ??
    ref.beat?.series?.userId ??
    ref.beat?.season?.series.userId ??
    ref.beat?.project?.userId ??
    ref.character?.project?.userId ??
    ref.character?.series?.userId;
  if (ownerId !== userId) return;

  await prisma.reference.delete({ where: { id: referenceId } });

  if (ref.kind === "FILE") {
    await del(ref.url).catch(() => {});
  }

  const paths = [
    ref.worldNote?.project && `/projects/${ref.worldNote.project.id}/world`,
    ref.worldNote?.series && `/series/${ref.worldNote.series.id}/bible`,
    ref.series && `/series/${ref.series.id}`,
    ref.season && `/series/${ref.season.seriesId}/seasons/${ref.season.id}`,
    ref.beat?.series && `/series/${ref.beat.series.id}`,
    ref.beat?.season && `/series/${ref.beat.season.seriesId}/seasons/${ref.beat.season.id}`,
    ref.beat?.project && `/projects/${ref.beat.project.id}`,
    ref.character?.project && `/projects/${ref.character.project.id}/characters`,
    ref.character?.series && `/series/${ref.character.series.id}/bible`,
  ].filter((p): p is string => Boolean(p));
  paths.forEach((p) => revalidatePath(p));
}
