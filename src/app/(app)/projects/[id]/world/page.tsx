import Link from "next/link";
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
  const project = await getProjectOrNotFound(id);

  const season = project.seasonId
    ? await prisma.season.findUnique({
        where: { id: project.seasonId },
        select: { seriesId: true },
      })
    : null;

  const notes = await prisma.worldNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    include: {
      references: {
        orderBy: { createdAt: "asc" },
        select: { id: true, kind: true, url: true, label: true, note: true, fileType: true },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {season && (
        <p className="text-xs text-neutral-500">
          Standing sets and world rules shared across the season live in the{" "}
          <Link href={`/series/${season.seriesId}/bible`} className="underline underline-offset-2">
            series bible
          </Link>
          .
        </p>
      )}
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
