import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildBackup } from "@/lib/backup-export";
import { previewBackupFor, restoreBackupFor } from "@/lib/backup-restore";

// Runs against a real database, so it only runs on request:
//   RUN_DB_TESTS=1 npx vitest run src/lib/backup-restore.integration.test.ts
// It creates two throwaway users and deletes them (and everything they own) afterwards.
const run = process.env.RUN_DB_TESTS === "1";

const stamp = Date.now();
let userA = "";
let userB = "";

async function seed(userId: string) {
  const series = await prisma.series.create({
    data: { userId, title: "Harbor Lights", premise: "A town and its tide" },
  });
  const season = await prisma.season.create({
    data: { seriesId: series.id, number: 1, title: "The Tide" },
  });
  const episode = await prisma.project.create({
    data: {
      userId,
      title: "Pilot",
      formatTemplate: "tv-pilot-hour",
      writingMode: "SCREENPLAY",
      seasonId: season.id,
      episodeNumber: 1,
      episodeTitle: "Low Water",
      draft: {
        create: {
          content: {
            type: "screenplay",
            elements: [{ id: "scene-1", type: "scene_heading", text: "INT. DOCK - DAY" }],
          },
          wordCount: 4,
          revision: 3,
        },
      },
    },
    include: { draft: true },
  });
  const version = await prisma.draftVersion.create({
    data: { draftId: episode.draft!.id, content: { type: "screenplay", elements: [] }, label: "v1" },
  });
  await prisma.draft.update({
    where: { id: episode.draft!.id },
    data: { lastLockedVersionId: version.id },
  });
  await prisma.draftComment.create({
    data: { draftId: episode.draft!.id, elementId: "scene-1", text: "Check the tide tables" },
  });

  const standalone = await prisma.project.create({
    data: {
      userId,
      title: "Standalone",
      formatTemplate: "feature-screenplay",
      writingMode: "SCREENPLAY",
      draft: { create: { content: { type: "screenplay", elements: [] } } },
    },
  });

  const seriesCharacter = await prisma.character.create({
    data: { seriesId: series.id, name: "Mara" },
  });
  const episodeCharacter = await prisma.character.create({
    data: { projectId: episode.id, name: "Eli" },
  });
  await prisma.worldNote.create({
    data: { projectId: episode.id, title: "Dock", category: "Location" },
  });
  await prisma.worldNote.create({ data: { seriesId: series.id, title: "The tide rules" } });

  const seriesBeat = await prisma.beat.create({
    data: { seriesId: series.id, title: "Premise", order: 0 },
  });
  const seasonBeat = await prisma.beat.create({
    data: { seasonId: season.id, projectId: episode.id, title: "Midpoint", order: 0 },
  });
  const projectBeat = await prisma.beat.create({
    data: { projectId: standalone.id, title: "Opening image", order: 0 },
  });
  const card = await prisma.outlineCard.create({
    data: {
      projectId: standalone.id,
      beatId: projectBeat.id,
      title: "Mara arrives",
      order: 0,
      linkedSceneId: "scene-1",
      characters: { connect: [{ id: seriesCharacter.id }] },
    },
  });
  await prisma.reference.create({
    data: {
      characterId: episodeCharacter.id,
      kind: "LINK",
      url: "https://example.com/eli",
      label: "Eli mood",
    },
  });
  await prisma.reference.create({
    data: { beatId: projectBeat.id, kind: "LINK", url: "https://example.com/beat", label: "Beat ref" },
  });

  await prisma.idea.create({ data: { userId, content: "A loose spark", tags: ["horror"] } });
  await prisma.idea.create({
    data: { userId, content: "Scoped idea", projectId: episode.id, seriesId: series.id, seasonId: season.id },
  });
  await prisma.idea.create({
    data: {
      userId,
      content: "Became a series",
      status: "PROMOTED",
      promotedSeriesId: series.id,
      promotedProjectId: standalone.id,
    },
  });

  return { series, season, episode, standalone, seriesBeat, seasonBeat, projectBeat, card };
}

async function snapshot(userId: string) {
  const [series, seasons, projects, characters, notes, beats, cards, refs, drafts, versions, comments, ideas] =
    await Promise.all([
      prisma.series.count({ where: { userId } }),
      prisma.season.count({ where: { series: { userId } } }),
      prisma.project.count({ where: { userId } }),
      prisma.character.count({ where: { OR: [{ project: { userId } }, { series: { userId } }] } }),
      prisma.worldNote.count({ where: { OR: [{ project: { userId } }, { series: { userId } }] } }),
      prisma.beat.count({
        where: { OR: [{ series: { userId } }, { season: { series: { userId } } }, { project: { userId } }] },
      }),
      prisma.outlineCard.count({ where: { project: { userId } } }),
      prisma.reference.count({
        where: {
          OR: [
            { character: { OR: [{ project: { userId } }, { series: { userId } }] } },
            { beat: { OR: [{ project: { userId } }, { series: { userId } }, { season: { series: { userId } } }] } },
            { worldNote: { OR: [{ project: { userId } }, { series: { userId } }] } },
            { series: { userId } },
            { season: { series: { userId } } },
          ],
        },
      }),
      prisma.draft.count({ where: { project: { userId } } }),
      prisma.draftVersion.count({ where: { draft: { project: { userId } } } }),
      prisma.draftComment.count({ where: { draft: { project: { userId } } } }),
      prisma.idea.count({ where: { userId } }),
    ]);
  return { series, seasons, projects, characters, notes, beats, cards, refs, drafts, versions, comments, ideas };
}

async function wipe(userId: string) {
  await prisma.idea.deleteMany({ where: { userId } });
  // Mirrors the app's deleteProject, which removes a script's own beats.
  await prisma.beat.deleteMany({
    where: { project: { userId }, seasonId: null, seriesId: null },
  });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.series.deleteMany({ where: { userId } });
}

describe.skipIf(!run)("backup restore (database)", () => {
  let original: Awaited<ReturnType<typeof seed>>;
  let expected: Awaited<ReturnType<typeof snapshot>>;
  let backup = "";

  beforeAll(async () => {
    userA = (
      await prisma.user.create({ data: { email: `restore-a-${stamp}@test.local`, passwordHash: "x" } })
    ).id;
    userB = (
      await prisma.user.create({ data: { email: `restore-b-${stamp}@test.local`, passwordHash: "x" } })
    ).id;
    original = await seed(userA);
    expected = await snapshot(userA);
    backup = JSON.stringify(await buildBackup(userA));
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB].filter(Boolean) } } });
    await prisma.$disconnect();
  });

  it("seeded everything it expects to restore", () => {
    expect(expected).toMatchObject({ series: 1, seasons: 1, projects: 2, characters: 2, cards: 1, ideas: 3 });
    expect(expected.refs).toBe(2);
    expect(expected.beats).toBe(3);
  });

  it("previews a full restore after everything is deleted, changing nothing", async () => {
    await wipe(userA);
    expect((await snapshot(userA)).projects).toBe(0);

    const preview = await previewBackupFor(userA, backup, "missing");
    expect(preview.counts.project).toEqual({ create: 2, skip: 0, drop: 0 });
    expect(preview.counts.card.create).toBe(1);
    expect((await snapshot(userA)).projects).toBe(0);
  });

  it("restores the whole account with relationships intact", async () => {
    const summary = await restoreBackupFor(userA, backup, "missing");
    expect(summary.counts.series.create).toBe(1);
    expect(await snapshot(userA)).toEqual(expected);

    // Same ids, so every link survives.
    const episode = await prisma.project.findUniqueOrThrow({
      where: { id: original.episode.id },
      include: { draft: { include: { versions: true, comments: true } } },
    });
    expect(episode.seasonId).toBe(original.season.id);
    expect(episode.draft?.revision).toBe(0);
    expect(episode.draft?.versions).toHaveLength(1);
    expect(episode.draft?.comments[0].elementId).toBe("scene-1");
    expect(episode.draft?.lastLockedVersionId).toBe(episode.draft?.versions[0].id);
    expect(JSON.stringify(episode.draft?.content)).toContain("INT. DOCK - DAY");

    const card = await prisma.outlineCard.findUniqueOrThrow({
      where: { id: original.card.id },
      include: { characters: true },
    });
    expect(card.beatId).toBe(original.projectBeat.id);
    expect(card.linkedSceneId).toBe("scene-1");
    expect(card.characters).toHaveLength(1);

    const seasonBeat = await prisma.beat.findUniqueOrThrow({ where: { id: original.seasonBeat.id } });
    expect(seasonBeat.projectId).toBe(original.episode.id);
    expect(seasonBeat.seasonId).toBe(original.season.id);

    const promoted = await prisma.idea.findFirstOrThrow({ where: { userId: userA, status: "PROMOTED" } });
    expect(promoted.promotedSeriesId).toBe(original.series.id);
    const loose = await prisma.idea.findFirstOrThrow({ where: { userId: userA, content: "A loose spark" } });
    expect(loose.tags).toEqual(["horror"]);
  });

  it("is a no-op when run again", async () => {
    const summary = await restoreBackupFor(userA, backup, "missing");
    for (const counts of Object.values(summary.counts)) expect(counts.create).toBe(0);
    expect(await snapshot(userA)).toEqual(expected);
  });

  it("only brings back what was deleted", async () => {
    const eli = await prisma.character.findFirstOrThrow({
      where: { name: "Eli", project: { userId: userA } },
    });
    await prisma.character.delete({ where: { id: eli.id } });
    const summary = await restoreBackupFor(userA, backup, "missing");
    expect(summary.counts.character.create).toBe(1);
    expect(summary.counts.character.skip).toBe(1);
    // Its link reference was cascade-deleted with it, and comes back too.
    expect(summary.counts.reference.create).toBe(1);
    expect(await snapshot(userA)).toEqual(expected);
  });

  it("adds copies without touching what's there", async () => {
    const summary = await restoreBackupFor(userA, backup, "copies");
    expect(summary.counts.project.create).toBe(2);
    const after = await snapshot(userA);
    expect(after.projects).toBe(expected.projects * 2);
    expect(after.cards).toBe(expected.cards * 2);
    const copies = await prisma.project.findMany({
      where: { userId: userA, title: { contains: "(restored copy)" } },
    });
    expect(copies.length).toBeGreaterThan(0);
    // Originals are untouched.
    expect(await prisma.project.findUnique({ where: { id: original.standalone.id } })).not.toBeNull();
  });

  it("never links into another user's data when ids collide", async () => {
    const before = await snapshot(userA);
    const summary = await restoreBackupFor(userB, backup, "missing");
    expect(summary.counts.project.create).toBe(2);
    expect(summary.counts.project.skip).toBe(0);

    // User A is untouched; user B got fresh copies under new ids.
    expect(await snapshot(userA)).toEqual(before);
    const b = await snapshot(userB);
    expect(b).toMatchObject({ series: 1, projects: 2, cards: 1, ideas: 3 });
    const bProjects = await prisma.project.findMany({ where: { userId: userB } });
    expect(bProjects.every((p) => p.id !== original.episode.id && p.id !== original.standalone.id)).toBe(true);
    const bEpisode = bProjects.find((p) => p.title === "Pilot")!;
    const bSeason = await prisma.season.findUniqueOrThrow({ where: { id: bEpisode.seasonId! } });
    const bSeries = await prisma.series.findUniqueOrThrow({ where: { id: bSeason.seriesId } });
    expect(bSeries.userId).toBe(userB);
  });

  it("rejects files that aren't backups", async () => {
    await expect(previewBackupFor(userA, "{}", "missing")).rejects.toThrow(/Quill backup/);
    await expect(previewBackupFor(userA, backup, "bogus")).rejects.toThrow(/mode/);
  });
});
