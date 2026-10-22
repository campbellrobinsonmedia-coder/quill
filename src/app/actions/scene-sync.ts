"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import type { DraftContent, ScreenplayContent } from "@/lib/draft-content";
import { normalizeOutlineOrder } from "@/lib/outline-order";
import { buildLayout, flattenLayout } from "@/lib/plan-layout";
import { parseSceneHeading } from "@/lib/screenplay-analysis";
import {
  findUnlinkedScenes,
  isScriptInOrder,
  reorderLinkedScenes,
  sceneIdsInOrder,
  sortCardsByScriptOrder,
} from "@/lib/scene-sync";
import type { Prisma } from "@/generated/prisma/client";

async function loadScreenplay(userId: string, projectId: string) {
  const draft = await prisma.draft.findFirst({
    where: { projectId, project: { userId } },
  });
  if (!draft) throw new Error("Not found");
  const content = draft.content as unknown as DraftContent;
  if (content.type !== "screenplay") {
    throw new Error("Scene sync is only available for screenplay projects");
  }
  return { draft, content: content as ScreenplayContent };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/write`);
}

// Creates an outline card (unplanned, linked) for each script scene that
// doesn't have one yet. Pass sceneIds to limit it to specific scenes.
export async function addCardsForScenes(projectId: string, sceneIds?: string[]) {
  const userId = await requireUserId();
  const { content } = await loadScreenplay(userId, projectId);

  const existing = await prisma.outlineCard.findMany({
    where: { projectId },
    select: { linkedSceneId: true, order: true },
  });
  const wanted = sceneIds ? new Set(sceneIds) : null;
  const scenes = findUnlinkedScenes(
    content.elements,
    existing.map((c) => c.linkedSceneId)
  ).filter((s) => {
    const heading = content.elements.find((el) => el.id === s.id);
    return s.text && !heading?.omitted && (!wanted || wanted.has(s.id));
  });
  if (scenes.length === 0) return { created: 0 };

  let order = existing.reduce((max, c) => Math.max(max, c.order), -1) + 1;
  await prisma.outlineCard.createMany({
    data: scenes.map((s) => ({
      projectId,
      title: s.text,
      location: parseSceneHeading(s.text).location || null,
      linkedSceneId: s.id,
      order: order++,
    })),
  });

  await normalizeOutlineOrder(projectId);
  revalidateProject(projectId);
  return { created: scenes.length };
}

// Rearranges the script's scenes to follow the Plan board. The current script
// is saved as a version first, so it's always one click to undo.
export async function reorderScriptToOutline(projectId: string) {
  const userId = await requireUserId();
  const { draft, content } = await loadScreenplay(userId, projectId);

  const cards = await prisma.outlineCard.findMany({
    where: { projectId, linkedSceneId: { not: null } },
    orderBy: { order: "asc" },
    select: { linkedSceneId: true },
  });
  const desired = cards.map((c) => c.linkedSceneId!);
  if (isScriptInOrder(content.elements, desired)) return { changed: false, revision: draft.revision };

  const elements = reorderLinkedScenes(content.elements, desired);
  const next: ScreenplayContent = { type: "screenplay", elements };

  await prisma.draftVersion.create({
    data: {
      draftId: draft.id,
      content: draft.content as Prisma.InputJsonValue,
      wordCount: draft.wordCount,
      label: "Before matching the script to the outline",
    },
  });
  const updated = await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: next as unknown as Prisma.InputJsonValue,
      revision: { increment: 1 },
    },
    select: { revision: true },
  });

  revalidateProject(projectId);
  return { changed: true, revision: updated.revision };
}

// Orders the scenes inside each beat (and the unplanned column) to follow the
// script. Which beat a scene sits under is never changed.
export async function reorderOutlineToScript(projectId: string) {
  const userId = await requireUserId();
  const { content } = await loadScreenplay(userId, projectId);

  const [beats, cards] = await Promise.all([
    prisma.beat.findMany({
      where: { projectId, seasonId: null, seriesId: null },
      select: { id: true, order: true },
    }),
    prisma.outlineCard.findMany({
      where: { projectId },
      select: { id: true, beatId: true, order: true, linkedSceneId: true },
    }),
  ]);

  const layout = buildLayout(beats, cards);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const scriptOrder = sceneIdsInOrder(content.elements);
  const columns: Record<string, string[]> = {};
  for (const [col, ids] of Object.entries(layout.columns)) {
    columns[col] = sortCardsByScriptOrder(
      ids.map((id) => byId.get(id)!),
      scriptOrder
    ).map((c) => c.id);
  }

  const flat = flattenLayout({ beatIds: layout.beatIds, columns });
  const changes = flat
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => byId.get(id)!.order !== index);

  if (changes.length > 0) {
    await prisma.$transaction(
      changes.map(({ id, index }) =>
        prisma.outlineCard.update({ where: { id }, data: { order: index } })
      )
    );
  }

  revalidateProject(projectId);
  return { changed: changes.length > 0 };
}
