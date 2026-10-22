import { prisma } from "@/lib/prisma";
import { buildLayout, flattenLayout } from "@/lib/plan-layout";

// OutlineCard.order is the flattened story order of the Plan board (unplanned
// scenes first, then each beat's scenes in beat order). Anything that reads
// cards sorted by `order` — the thread matrix, exports — relies on that, so any
// change that moves or removes a card or beat renumbers it here.
export async function normalizeOutlineOrder(projectId: string) {
  const [beats, cards] = await Promise.all([
    prisma.beat.findMany({
      where: { projectId, seasonId: null, seriesId: null },
      select: { id: true, order: true },
    }),
    prisma.outlineCard.findMany({
      where: { projectId },
      select: { id: true, beatId: true, order: true },
    }),
  ]);

  const flat = flattenLayout(buildLayout(beats, cards));
  const current = new Map(cards.map((c) => [c.id, c.order]));
  const changes = flat
    .map((id, index) => ({ id, index }))
    .filter(({ id, index }) => current.get(id) !== index);

  if (changes.length > 0) {
    await prisma.$transaction(
      changes.map(({ id, index }) =>
        prisma.outlineCard.update({ where: { id }, data: { order: index } })
      )
    );
  }
}
