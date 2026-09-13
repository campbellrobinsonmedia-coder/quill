import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { NewCharacterForm } from "@/components/new-character-form";
import { CharacterItem } from "@/components/character-item";

export default async function CharactersPage({
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

  const characters = await prisma.character.findMany({
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
          Recurring/season-wide characters live in the{" "}
          <Link href={`/series/${season.seriesId}/bible`} className="underline underline-offset-2">
            series bible
          </Link>{" "}
          — they show up automatically in this episode&apos;s outline and script.
        </p>
      )}
      <NewCharacterForm projectId={id} />
      {characters.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No characters yet — add your first one above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {characters.map((c) => (
            <CharacterItem key={c.id} character={c} />
          ))}
        </div>
      )}
    </div>
  );
}
