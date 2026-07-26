import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { NewWorldNoteForm } from "@/components/new-world-note-form";
import { WorldNoteItem } from "@/components/world-note-item";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProjectOrNotFound(id);

  const notes = await prisma.worldNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <NewWorldNoteForm projectId={id} />
      {notes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No world notes yet — capture a location, object, or bit of lore above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <WorldNoteItem key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  );
}
