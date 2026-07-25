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
  await getProjectOrNotFound(id);

  const characters = await prisma.character.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
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
