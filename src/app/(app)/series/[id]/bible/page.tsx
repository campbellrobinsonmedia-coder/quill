import { prisma } from "@/lib/prisma";
import { getSeriesOrNotFound } from "@/lib/get-series";
import { NewCharacterForm } from "@/components/new-character-form";
import { CharacterItem } from "@/components/character-item";
import { NewWorldNoteForm } from "@/components/new-world-note-form";
import { WorldNoteItem } from "@/components/world-note-item";

export default async function SeriesBiblePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getSeriesOrNotFound(id);

  const referenceSelect = {
    id: true,
    kind: true,
    url: true,
    label: true,
    note: true,
    fileType: true,
  } as const;

  const [characters, worldNotes] = await Promise.all([
    prisma.character.findMany({
      where: { seriesId: id },
      orderBy: { createdAt: "asc" },
      include: { references: { orderBy: { createdAt: "asc" }, select: referenceSelect } },
    }),
    prisma.worldNote.findMany({
      where: { seriesId: id },
      orderBy: { createdAt: "asc" },
      include: { references: { orderBy: { createdAt: "asc" }, select: referenceSelect } },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-10 p-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-neutral-500">
            Recurring characters ({characters.length})
          </h2>
          <p className="text-xs text-neutral-400">
            Shared across every season and episode in this series.
          </p>
        </div>
        <NewCharacterForm seriesId={id} />
        {characters.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No recurring characters yet — add your leads and regulars above.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {characters.map((c) => (
              <CharacterItem key={c.id} character={c} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium text-neutral-500">
            World & continuity notes ({worldNotes.length})
          </h2>
          <p className="text-xs text-neutral-400">
            Standing sets, franchise rules, and lore shared across the series.
          </p>
        </div>
        <NewWorldNoteForm seriesId={id} />
        {worldNotes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No entries yet — capture standing sets, world rules, or lore above.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {worldNotes.map((n) => (
              <WorldNoteItem key={n.id} note={n} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
