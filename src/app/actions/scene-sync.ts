"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import {
  countWords,
  createEmptyContent,
  makeId,
  type DraftContent,
  type ScreenplayContent,
} from "@/lib/draft-content";
import { headingForCard } from "@/lib/card-face";
import { nameKey } from "@/lib/cast";
import { normalizeOutlineOrder } from "@/lib/outline-order";
import { buildLayout, flattenLayout } from "@/lib/plan-layout";
import { parseSceneHeading } from "@/lib/screenplay-analysis";
import {
  findUnlinkedScenes,
  insertSceneForCard,
  isScriptInOrder,
  reorderLinkedScenes,
  sceneFacts,
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

// Starts the script scene for a card: a heading (from the card's location) and
// an empty action line, placed where the Plan board has the card, and linked to
// it. Returns the scene's id so the caller can open the script there.
export async function startSceneFromCard(cardId: string) {
  const userId = await requireUserId();
  const card = await prisma.outlineCard.findFirst({
    where: { id: cardId, project: { userId } },
    select: { id: true, projectId: true, location: true, linkedSceneId: true, project: { select: { writingMode: true } } },
  });
  if (!card) throw new Error("Not found");
  if (card.project.writingMode !== "SCREENPLAY") {
    throw new Error("Scenes can only be started in a screenplay");
  }

  const draft =
    (await prisma.draft.findUnique({ where: { projectId: card.projectId } })) ??
    (await prisma.draft.create({
      data: {
        projectId: card.projectId,
        content: createEmptyContent("SCREENPLAY") as unknown as Prisma.InputJsonValue,
      },
    }));
  const content = draft.content as unknown as DraftContent;
  if (content.type !== "screenplay") throw new Error("Scenes can only be started in a screenplay");

  if (card.linkedSceneId && sceneIdsInOrder(content.elements).includes(card.linkedSceneId)) {
    return { sceneId: card.linkedSceneId, created: false };
  }

  const cards = await prisma.outlineCard.findMany({
    where: { projectId: card.projectId },
    orderBy: { order: "asc" },
    select: { id: true, linkedSceneId: true },
  });
  const heading = { id: makeId(), type: "scene_heading" as const, text: headingForCard(card.location) };
  const action = { id: makeId(), type: "action" as const, text: "" };
  const next: ScreenplayContent = {
    type: "screenplay",
    elements: insertSceneForCard(
      content.elements,
      cards.map((c) => c.linkedSceneId),
      cards.findIndex((c) => c.id === card.id),
      { heading, action }
    ),
  };

  // Only write if nobody saved the script since we read it.
  const saved = await prisma.draft.updateMany({
    where: { id: draft.id, revision: draft.revision },
    data: {
      content: next as unknown as Prisma.InputJsonValue,
      wordCount: countWords(next),
      revision: { increment: 1 },
    },
  });
  if (saved.count === 0) throw new Error("The script changed while this was happening — try again");

  await prisma.outlineCard.update({ where: { id: card.id }, data: { linkedSceneId: heading.id } });
  revalidateProject(card.projectId);
  return { sceneId: heading.id, created: true };
}

// What the script says about a card's scene, for "update from scene": the
// location and which saved characters speak in it. Nothing is changed here; the
// card panel shows it and the writer saves it if they want it.
export async function sceneFactsForCard(cardId: string) {
  const userId = await requireUserId();
  const card = await prisma.outlineCard.findFirst({
    where: { id: cardId, project: { userId } },
    select: {
      projectId: true,
      linkedSceneId: true,
      project: { select: { season: { select: { seriesId: true } } } },
    },
  });
  if (!card?.linkedSceneId) return null;

  const draft = await prisma.draft.findUnique({ where: { projectId: card.projectId } });
  const content = draft?.content as unknown as DraftContent | undefined;
  if (content?.type !== "screenplay") return null;
  const facts = sceneFacts(content.elements, card.linkedSceneId);
  if (!facts) return null;

  const seriesId = card.project.season?.seriesId;
  const characters = await prisma.character.findMany({
    where: { OR: seriesId ? [{ projectId: card.projectId }, { seriesId }] : [{ projectId: card.projectId }] },
    select: { id: true, name: true },
  });
  const byKey = new Map(characters.map((c) => [nameKey(c.name), c.id]));
  return {
    location: facts.location,
    characterIds: facts.speakers.flatMap((s) => byKey.get(s) ?? []),
    unmatched: facts.speakers.filter((s) => !byKey.has(s)),
  };
}
