import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { NewCharacterForm } from "@/components/new-character-form";
import { CharacterItem } from "@/components/character-item";
import type { Metadata } from "next";
import { ScriptNamesPanel } from "@/components/script-names-panel";
import { formatCastStats, missingFromSaved, nameKey } from "@/lib/cast";
import { buildCharacterReport, buildSceneReport } from "@/lib/screenplay-analysis";
import type { DraftContent } from "@/lib/draft-content";

export const metadata: Metadata = { title: "Characters" };

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

  const [seriesCharacters, draft] = await Promise.all([
    season
      ? prisma.character.findMany({
          where: { seriesId: season.seriesId },
          select: { name: true },
        })
      : Promise.resolve([]),
    prisma.draft.findUnique({
      where: { projectId: id },
      select: { content: true, sceneNumbersLocked: true },
    }),
  ]);

  // Who speaks in the script, matched against who you've saved.
  const content = draft?.content as unknown as DraftContent | undefined;
  const report =
    content?.type === "screenplay"
      ? buildCharacterReport(content, buildSceneReport(content, draft?.sceneNumbersLocked ?? false))
      : [];
  const statsByName = new Map(report.map((r) => [nameKey(r.name), r]));
  const missing = missingFromSaved(report, [
    ...characters.map((c) => c.name),
    ...seriesCharacters.map((c) => c.name),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
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
      <ScriptNamesPanel
        projectId={id}
        kind="character"
        canUseSeries={Boolean(season)}
        rows={missing.map((r) => ({
          name: r.name,
          detail: formatCastStats(r),
        }))}
      />
      {characters.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No characters yet — add your first one above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {characters.map((c) => (
            <CharacterItem
              key={c.id}
              character={{
                ...c,
                stats: statsByName.has(nameKey(c.name))
                  ? formatCastStats(statsByName.get(nameKey(c.name))!)
                  : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
