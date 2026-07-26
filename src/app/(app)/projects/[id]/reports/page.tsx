import { prisma } from "@/lib/prisma";
import { getProjectOrNotFound } from "@/lib/get-project";
import type { DraftContent } from "@/lib/draft-content";
import {
  buildSceneReport,
  buildLocationReport,
  buildCharacterReport,
} from "@/lib/screenplay-analysis";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getProjectOrNotFound(id);

  const draft = await prisma.draft.findUnique({ where: { projectId: id } });
  const content = draft?.content as unknown as DraftContent | undefined;

  if (!content || content.type !== "screenplay") {
    return (
      <div className="p-6">
        <p className="text-sm text-neutral-500">
          Reports are available for screenplay-format projects once you have
          scenes written.
        </p>
      </div>
    );
  }

  const sceneRows = buildSceneReport(content);
  const locationRows = buildLocationReport(sceneRows);
  const characterRows = buildCharacterReport(content, sceneRows);

  return (
    <div className="flex flex-1 flex-col gap-10 p-6">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Characters ({characterRows.length})
        </h2>
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-3 py-2">Character</th>
                <th className="px-3 py-2">Scenes</th>
                <th className="px-3 py-2">Lines</th>
                <th className="px-3 py-2">Dialogue words</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {characterRows.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">{c.sceneCount}</td>
                  <td className="px-3 py-2">{c.lineCount}</td>
                  <td className="px-3 py-2">{c.dialogueWordCount}</td>
                </tr>
              ))}
              {characterRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-neutral-500">
                    No dialogue yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Locations ({locationRows.length})
        </h2>
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Scenes</th>
                <th className="px-3 py-2">INT</th>
                <th className="px-3 py-2">EXT</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Night</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {locationRows.map((l) => (
                <tr key={l.location}>
                  <td className="px-3 py-2 font-medium">{l.location}</td>
                  <td className="px-3 py-2">{l.sceneCount}</td>
                  <td className="px-3 py-2">{l.intCount}</td>
                  <td className="px-3 py-2">{l.extCount}</td>
                  <td className="px-3 py-2">{l.dayCount}</td>
                  <td className="px-3 py-2">{l.nightCount}</td>
                </tr>
              ))}
              {locationRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-neutral-500">
                    No scenes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Scenes ({sceneRows.length})
        </h2>
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Characters</th>
                <th className="px-3 py-2">Words</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {sceneRows.map((s) => (
                <tr key={s.number} className={s.omitted ? "text-neutral-400 line-through" : ""}>
                  <td className="px-3 py-2">{s.number}</td>
                  <td className="px-3 py-2 font-medium">
                    {s.prefix} {s.location}
                  </td>
                  <td className="px-3 py-2">{s.time}</td>
                  <td className="px-3 py-2">{s.characters.join(", ")}</td>
                  <td className="px-3 py-2">{s.wordCount}</td>
                </tr>
              ))}
              {sceneRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-neutral-500">
                    No scenes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
