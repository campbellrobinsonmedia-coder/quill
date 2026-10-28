import Link from "next/link";
import { getSeasonOrNotFound } from "@/lib/get-series";
import { prisma } from "@/lib/prisma";
import { buildCharacterMatrix, buildThreadMatrix } from "@/lib/season-matrix";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Season matrix" };

const TAB =
  "px-3 py-1.5 text-sm first:rounded-l-md last:rounded-r-md aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white dark:aria-[current=page]:bg-white dark:aria-[current=page]:text-neutral-900";

export default async function SeasonMatrixPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; seasonId: string }>;
  searchParams: Promise<{ by?: string }>;
}) {
  const { id, seasonId } = await params;
  const { by } = await searchParams;
  const season = await getSeasonOrNotFound(seasonId);
  const byCharacters = by === "characters";

  const episodes = await prisma.project.findMany({
    where: { seasonId },
    orderBy: { episodeNumber: "asc" },
    select: {
      id: true,
      title: true,
      episodeTitle: true,
      episodeNumber: true,
      outlineCards: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          storyThread: true,
          characters: { select: { id: true, name: true } },
        },
      },
    },
  });

  const matrixEpisodes = episodes.map((ep) => ({
    id: ep.id,
    number: ep.episodeNumber,
    cards: ep.outlineCards,
  }));
  const rows = byCharacters ? buildCharacterMatrix(matrixEpisodes) : buildThreadMatrix(matrixEpisodes);
  const flagged = rows.filter((r) => r.flags.length > 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/series/${id}/seasons/${seasonId}`}
          className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Season {season.number}
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {byCharacters ? "Characters by episode" : "Storylines by episode"}
          </h2>
          <p className="text-sm text-neutral-500">
            {byCharacters
              ? "Which characters are on the scene cards of each episode — choose who's in a scene on its card."
              : "Which episodes each tagged storyline appears in — tag scene cards with a storyline (A/B/C) to see them here."}
          </p>
        </div>
        <nav
          aria-label="Matrix type"
          className="inline-flex divide-x divide-neutral-300 rounded-md border border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700"
        >
          <Link
            href={`/series/${id}/seasons/${seasonId}/threads`}
            aria-current={byCharacters ? undefined : "page"}
            className={TAB}
          >
            Storylines
          </Link>
          <Link
            href={`/series/${id}/seasons/${seasonId}/threads?by=characters`}
            aria-current={byCharacters ? "page" : undefined}
            className={TAB}
          >
            Characters
          </Link>
        </nav>
      </div>

      {rows.length === 0 || episodes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {byCharacters
            ? "No characters are on any scene cards yet — open a card and choose who's in the scene."
            : "No tagged storylines yet — add a “Storyline” to scene cards in any episode of this season to build the matrix."}
        </p>
      ) : (
        <>
          {flagged.length > 0 && (
            <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {flagged.map((r) => (
                <li key={r.key}>
                  <span className="font-medium">{r.label}:</span> {r.flags.join("; ")}
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-neutral-500 dark:bg-neutral-950">
                    {byCharacters ? "Character" : "Storyline"}
                  </th>
                  {episodes.map((ep) => (
                    <th
                      key={ep.id}
                      className="min-w-[10rem] border-l border-neutral-200 p-2 text-left text-xs font-medium text-neutral-500 dark:border-neutral-800"
                    >
                      Ep {ep.episodeNumber}
                      <br />
                      <span className="font-normal text-neutral-500 dark:text-neutral-400">
                        {ep.episodeTitle || ep.title}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="sticky left-0 bg-white p-2 align-top font-medium dark:bg-neutral-950">
                      {row.label}
                      <span className="ml-1.5 text-xs font-normal text-neutral-400">{row.total}</span>
                      {row.flags.length > 0 && (
                        <span
                          className="ml-1.5 text-amber-600 dark:text-amber-400"
                          title={row.flags.join("; ")}
                          aria-label={row.flags.join("; ")}
                        >
                          ⚠
                        </span>
                      )}
                    </td>
                    {row.cells.map((titles, i) => (
                      <td
                        key={episodes[i].id}
                        className="border-l border-neutral-200 p-2 align-top dark:border-neutral-800"
                      >
                        {titles.length === 0 ? (
                          <span className="text-neutral-300 dark:text-neutral-700">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {titles.map((t, j) => (
                              <li key={j} className="text-xs text-neutral-600 dark:text-neutral-400">
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
