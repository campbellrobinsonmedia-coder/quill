import Link from "next/link";
import { getSeasonOrNotFound } from "@/lib/get-series";
import { prisma } from "@/lib/prisma";

export default async function ThreadMatrixPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  const season = await getSeasonOrNotFound(seasonId);

  const episodes = await prisma.project.findMany({
    where: { seasonId },
    orderBy: { episodeNumber: "asc" },
    select: {
      id: true,
      title: true,
      episodeTitle: true,
      episodeNumber: true,
      outlineCards: {
        where: { storyThread: { not: null } },
        select: { title: true, storyThread: true },
        orderBy: { order: "asc" },
      },
    },
  });

  const threads = Array.from(
    new Set(
      episodes.flatMap((ep) => ep.outlineCards.map((c) => c.storyThread!))
    )
  ).sort();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/series/${id}/seasons/${seasonId}`}
          className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Season {season.number}
        </Link>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Storyline thread matrix</h2>
        <p className="text-sm text-neutral-500">
          Which episodes each tagged storyline appears in — tag outline cards
          with a storyline (A/B/C) to see them here.
        </p>
      </div>

      {threads.length === 0 || episodes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No tagged storylines yet — add a &quot;Storyline&quot; to outline
          cards in any episode of this season to build the matrix.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white p-2 text-left text-xs font-medium text-neutral-500 dark:bg-neutral-950">
                  Thread
                </th>
                {episodes.map((ep) => (
                  <th
                    key={ep.id}
                    className="min-w-[10rem] border-l border-neutral-200 p-2 text-left text-xs font-medium text-neutral-500 dark:border-neutral-800"
                  >
                    Ep {ep.episodeNumber}
                    <br />
                    <span className="font-normal text-neutral-400">
                      {ep.episodeTitle || ep.title}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr key={thread} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="sticky left-0 bg-white p-2 font-medium dark:bg-neutral-950">
                    {thread}
                  </td>
                  {episodes.map((ep) => {
                    const cards = ep.outlineCards.filter(
                      (c) => c.storyThread === thread
                    );
                    return (
                      <td
                        key={ep.id}
                        className="border-l border-neutral-200 p-2 align-top dark:border-neutral-800"
                      >
                        {cards.length === 0 ? (
                          <span className="text-neutral-300 dark:text-neutral-700">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {cards.map((c, i) => (
                              <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                                {c.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
