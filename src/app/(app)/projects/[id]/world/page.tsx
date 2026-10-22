import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import { NewWorldNoteForm } from "@/components/new-world-note-form";
import { WorldNoteItem } from "@/components/world-note-item";
import type { Metadata } from "next";
import { ScriptNamesPanel } from "@/components/script-names-panel";
import { formatLocationStats, missingFromSaved, nameKey } from "@/lib/cast";
import { buildLocationReport, buildSceneReport } from "@/lib/screenplay-analysis";
import type { DraftContent } from "@/lib/draft-content";

export const metadata: Metadata = { title: "World" };

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

  const [seriesNotes, draft] = await Promise.all([
    season
      ? prisma.worldNote.findMany({
          where: { seriesId: season.seriesId },
          select: { title: true },
        })
      : Promise.resolve([]),
    prisma.draft.findUnique({
      where: { projectId: id },
      select: { content: true, sceneNumbersLocked: true },
    }),
  ]);

  // Locations used in scene headings, matched against saved world notes.
  const content = draft?.content as unknown as DraftContent | undefined;
  const locations =
    content?.type === "screenplay"
      ? buildLocationReport(buildSceneReport(content, draft?.sceneNumbersLocked ?? false)).filter(
          (l) => l.location !== "(unspecified)"
        )
      : [];
  const statsByTitle = new Map(locations.map((l) => [nameKey(l.location), l]));
  const missing = missingFromSaved(
    locations.map((l) => ({ ...l, name: l.location })),
    [...notes.map((n) => n.title), ...seriesNotes.map((n) => n.title)]
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
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
      <ScriptNamesPanel
        projectId={id}
        kind="location"
        canUseSeries={Boolean(season)}
        rows={missing.map((l) => ({ name: l.location, detail: formatLocationStats(l) }))}
      />
      {notes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No world notes yet — capture a location, object, or bit of lore above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((n) => (
            <WorldNoteItem
              key={n.id}
              note={{
                ...n,
                stats: statsByTitle.has(nameKey(n.title))
                  ? formatLocationStats(statsByTitle.get(nameKey(n.title))!)
                  : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
