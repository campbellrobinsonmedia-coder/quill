import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  BACKUP_KINDS,
  parseBackup,
  readBool,
  readDate,
  readNum,
  readStr,
  readTags,
  type BackupKind,
  type FlatBackup,
  type Rec,
} from "@/lib/backup";
import { FORMAT_TEMPLATES } from "@/lib/format-templates";
import type { Prisma } from "@/generated/prisma/client";

// Restoring only ever ADDS. In "missing" mode a record whose id is already in
// your account (and sits under the same parent) is left exactly as it is, so
// it's safe to run after a partial loss. In "copies" mode everything comes back
// under new ids, next to what you already have. Nothing is overwritten or deleted.

type Db = Prisma.TransactionClient;
export type RestoreMode = "missing" | "copies";
export type KindSummary = { create: number; skip: number; drop: number };
export type RestoreSummary = {
  exportedAt: string | null;
  counts: Record<BackupKind, KindSummary>;
};

const MAX_BYTES = 24 * 1024 * 1024;
const CHUNK = 500;

type Parent = { field: string; kind: BackupKind };
type Spec = {
  /** Every parent field a record of this kind can have. */
  parents: Parent[];
  /** Parent fields that must be present and resolve, or the record is dropped. */
  required?: string[];
  /** At least one of these must resolve, or the record is dropped. */
  anyOf?: string[];
  /** Belongs to the user directly (checked by userId rather than by parent). */
  owned?: boolean;
};

const SPECS: Record<BackupKind, Spec> = {
  series: { parents: [], owned: true },
  season: { parents: [{ field: "seriesId", kind: "series" }], required: ["seriesId"] },
  project: { parents: [{ field: "seasonId", kind: "season" }], owned: true },
  idea: {
    parents: [
      { field: "projectId", kind: "project" },
      { field: "seriesId", kind: "series" },
      { field: "seasonId", kind: "season" },
      { field: "promotedProjectId", kind: "project" },
      { field: "promotedSeriesId", kind: "series" },
    ],
    owned: true,
  },
  character: {
    parents: [
      { field: "projectId", kind: "project" },
      { field: "seriesId", kind: "series" },
    ],
    anyOf: ["projectId", "seriesId"],
  },
  note: {
    parents: [
      { field: "projectId", kind: "project" },
      { field: "seriesId", kind: "series" },
    ],
    anyOf: ["projectId", "seriesId"],
  },
  beat: {
    parents: [
      { field: "seriesId", kind: "series" },
      { field: "seasonId", kind: "season" },
      { field: "projectId", kind: "project" },
    ],
    anyOf: ["seriesId", "seasonId", "projectId"],
  },
  card: {
    parents: [
      { field: "projectId", kind: "project" },
      { field: "beatId", kind: "beat" },
    ],
    required: ["projectId"],
  },
  reference: {
    parents: [
      { field: "worldNoteId", kind: "note" },
      { field: "seriesId", kind: "series" },
      { field: "seasonId", kind: "season" },
      { field: "beatId", kind: "beat" },
      { field: "characterId", kind: "character" },
    ],
    anyOf: ["worldNoteId", "seriesId", "seasonId", "beatId", "characterId"],
  },
  draft: { parents: [{ field: "projectId", kind: "project" }], required: ["projectId"] },
  version: { parents: [{ field: "draftId", kind: "draft" }], required: ["draftId"] },
  comment: { parents: [{ field: "draftId", kind: "draft" }], required: ["draftId"] },
};

// Order matters: parents are created before the records that point at them.
const ORDER: BackupKind[] = [
  "series",
  "season",
  "project",
  "idea",
  "character",
  "note",
  "beat",
  "card",
  "reference",
  "draft",
  "version",
  "comment",
];

type Item = {
  rec: Rec;
  id: string;
  skip: boolean;
  parents: Record<string, string | null>;
};
type Plan = {
  items: Record<BackupKind, Item[]>;
  maps: Record<BackupKind, Map<string, string>>;
  dropped: Record<BackupKind, number>;
};

async function fetchRows(db: Db, kind: BackupKind, ids: string[]): Promise<Rec[]> {
  if (ids.length === 0) return [];
  const where = { id: { in: ids } };
  switch (kind) {
    case "series":
      return db.series.findMany({ where, select: { id: true, userId: true } });
    case "season":
      return db.season.findMany({ where, select: { id: true, seriesId: true } });
    case "project":
      return db.project.findMany({ where, select: { id: true, userId: true } });
    case "idea":
      return db.idea.findMany({ where, select: { id: true, userId: true } });
    case "character":
      return db.character.findMany({ where, select: { id: true, projectId: true, seriesId: true } });
    case "note":
      return db.worldNote.findMany({ where, select: { id: true, projectId: true, seriesId: true } });
    case "beat":
      return db.beat.findMany({
        where,
        select: { id: true, seriesId: true, seasonId: true, projectId: true },
      });
    case "card":
      return db.outlineCard.findMany({ where, select: { id: true, projectId: true, beatId: true } });
    case "reference":
      return db.reference.findMany({
        where,
        select: {
          id: true,
          worldNoteId: true,
          seriesId: true,
          seasonId: true,
          beatId: true,
          characterId: true,
        },
      });
    case "draft":
      return db.draft.findMany({ where, select: { id: true, projectId: true } });
    case "version":
      return db.draftVersion.findMany({ where, select: { id: true, draftId: true } });
    case "comment":
      return db.draftComment.findMany({ where, select: { id: true, draftId: true } });
  }
}

async function buildPlan(
  db: Db,
  userId: string,
  flat: FlatBackup,
  mode: RestoreMode
): Promise<Plan> {
  const maps = Object.fromEntries(BACKUP_KINDS.map((k) => [k, new Map<string, string>()])) as Plan["maps"];
  const items = Object.fromEntries(BACKUP_KINDS.map((k) => [k, [] as Item[]])) as Plan["items"];
  const dropped = Object.fromEntries(BACKUP_KINDS.map((k) => [k, 0])) as Plan["dropped"];

  for (const kind of ORDER) {
    const spec = SPECS[kind];

    // Work out each record's parents under their (possibly new) ids.
    const candidates: { rec: Rec; oldId: string; parents: Record<string, string | null> }[] = [];
    for (const rec of flat[kind]) {
      const oldId = readStr(rec.id);
      if (!oldId) continue;
      const parents: Record<string, string | null> = {};
      for (const p of spec.parents) {
        const oldParent = readStr(rec[p.field]);
        parents[p.field] = oldParent ? (maps[p.kind].get(oldParent) ?? null) : null;
      }
      const ok =
        (spec.required ?? []).every((f) => parents[f] !== null) &&
        (!spec.anyOf || spec.anyOf.some((f) => parents[f] !== null));
      if (!ok) {
        dropped[kind]++;
        continue;
      }
      candidates.push({ rec, oldId, parents });
    }

    // Drafts are one-per-script: an existing draft for the script means skip.
    let existing = new Map<string, Rec>();
    let takenDraftIds = new Set<string>();
    if (mode === "missing" && candidates.length > 0) {
      if (kind === "draft") {
        const projectIds = candidates.map((c) => c.parents.projectId!).filter(Boolean);
        const rows = await db.draft.findMany({
          where: { projectId: { in: projectIds } },
          select: { id: true, projectId: true },
        });
        existing = new Map(rows.map((r) => [r.projectId, r as Rec]));
        // A draft id that's already used elsewhere can't be reused.
        const byId = await fetchRows(db, "draft", candidates.map((c) => c.oldId));
        takenDraftIds = new Set(byId.map((r) => String(r.id)));
      } else {
        const rows = await fetchRows(db, kind, candidates.map((c) => c.oldId));
        existing = new Map(rows.map((r) => [String(r.id), r]));
      }
    }

    for (const c of candidates) {
      if (mode === "copies") {
        const id = randomUUID();
        maps[kind].set(c.oldId, id);
        items[kind].push({ rec: c.rec, id, skip: false, parents: c.parents });
        continue;
      }

      if (kind === "draft") {
        const row = existing.get(c.parents.projectId!);
        if (row) {
          maps.draft.set(c.oldId, String(row.id));
          items.draft.push({ rec: c.rec, id: String(row.id), skip: true, parents: c.parents });
          continue;
        }
        if (takenDraftIds.has(c.oldId)) {
          const id = randomUUID();
          maps.draft.set(c.oldId, id);
          items.draft.push({ rec: c.rec, id, skip: false, parents: c.parents });
          continue;
        }
      } else {
        const row = existing.get(c.oldId);
        if (row) {
          const sameOwner = spec.owned ? row.userId === userId : true;
          const sameParents = spec.owned
            ? true
            : spec.parents.every((p) => (row[p.field] ?? null) === (c.parents[p.field] ?? null));
          if (sameOwner && sameParents) {
            maps[kind].set(c.oldId, c.oldId);
            items[kind].push({ rec: c.rec, id: c.oldId, skip: true, parents: c.parents });
            continue;
          }
          // The id exists but belongs to someone/something else: never link to
          // it. Bring the record in under a fresh id instead.
          const id = randomUUID();
          maps[kind].set(c.oldId, id);
          items[kind].push({ rec: c.rec, id, skip: false, parents: c.parents });
          continue;
        }
      }
      maps[kind].set(c.oldId, c.oldId);
      items[kind].push({ rec: c.rec, id: c.oldId, skip: false, parents: c.parents });
    }
  }

  return { items, maps, dropped };
}

function summarize(plan: Plan, flat: FlatBackup): RestoreSummary {
  const counts = Object.fromEntries(
    BACKUP_KINDS.map((k) => [
      k,
      {
        create: plan.items[k].filter((i) => !i.skip).length,
        skip: plan.items[k].filter((i) => i.skip).length,
        drop: plan.dropped[k],
      },
    ])
  ) as Record<BackupKind, KindSummary>;
  return { exportedAt: flat.exportedAt, counts };
}

const str = (v: unknown, fallback: string) => readStr(v) ?? fallback;
const enumOf = <const T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

async function createChunked<T>(rows: T[], create: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await create(rows.slice(i, i + CHUNK));
  }
}

async function execute(db: Db, userId: string, plan: Plan, mode: RestoreMode) {
  const fresh = (kind: BackupKind) => plan.items[kind].filter((i) => !i.skip);
  const suffix = mode === "copies" ? " (restored copy)" : "";

  await createChunked(fresh("series"), (chunk) =>
    db.series.createMany({
      data: chunk.map(({ rec, id }) => ({
        id,
        userId,
        title: str(rec.title, "Untitled series") + suffix,
        format: readStr(rec.format),
        premise: readStr(rec.premise),
        status: enumOf(rec.status, ["ACTIVE", "ARCHIVED"], "ACTIVE"),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("season"), (chunk) =>
    db.season.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        seriesId: parents.seriesId!,
        number: readNum(rec.number) ?? 1,
        title: readStr(rec.title),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("project"), (chunk) =>
    db.project.createMany({
      data: chunk.map(({ rec, id, parents }) => {
        const template = FORMAT_TEMPLATES.find((t) => t.id === rec.formatTemplate);
        return {
          id,
          userId,
          title: str(rec.title, "Untitled") + (parents.seasonId ? "" : suffix),
          formatTemplate: template?.id ?? str(rec.formatTemplate, "custom-screenplay"),
          writingMode: enumOf(rec.writingMode, ["PROSE", "SCREENPLAY"], template?.writingMode ?? "SCREENPLAY"),
          logline: readStr(rec.logline),
          status: enumOf(rec.status, ["ACTIVE", "ARCHIVED"], "ACTIVE"),
          titlePageAuthor: readStr(rec.titlePageAuthor),
          titlePageContact: readStr(rec.titlePageContact),
          titlePageBasedOn: readStr(rec.titlePageBasedOn),
          seasonId: parents.seasonId,
          episodeNumber: readNum(rec.episodeNumber),
          episodeTitle: readStr(rec.episodeTitle),
          storyBy: readStr(rec.storyBy),
          teleplayBy: readStr(rec.teleplayBy),
          createdAt: readDate(rec.createdAt),
        };
      }),
    })
  );

  await createChunked(fresh("idea"), (chunk) =>
    db.idea.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        userId,
        projectId: parents.projectId,
        seriesId: parents.seriesId,
        seasonId: parents.seasonId,
        title: readStr(rec.title),
        content: str(rec.content, ""),
        tags: readTags(rec.tags),
        status: enumOf(rec.status, ["SPARK", "DEVELOPING", "PROMOTED", "ARCHIVED"], "SPARK"),
        promotedProjectId: parents.promotedProjectId,
        promotedSeriesId: parents.promotedSeriesId,
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("character"), (chunk) =>
    db.character.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        projectId: parents.projectId,
        seriesId: parents.seriesId,
        name: str(rec.name, "Unnamed"),
        description: readStr(rec.description),
        arcNotes: readStr(rec.arcNotes),
        relationships: readStr(rec.relationships),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("note"), (chunk) =>
    db.worldNote.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        projectId: parents.projectId,
        seriesId: parents.seriesId,
        title: str(rec.title, "Untitled"),
        category: readStr(rec.category),
        description: readStr(rec.description),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("beat"), (chunk) =>
    db.beat.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        seriesId: parents.seriesId,
        seasonId: parents.seasonId,
        projectId: parents.projectId,
        title: str(rec.title, "Untitled"),
        summary: readStr(rec.summary),
        order: readNum(rec.order) ?? 0,
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("card"), (chunk) =>
    db.outlineCard.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        projectId: parents.projectId!,
        beatId: parents.beatId,
        title: str(rec.title, "Untitled"),
        summary: readStr(rec.summary),
        turn: readStr(rec.turn),
        colorTag: readStr(rec.colorTag),
        act: readStr(rec.act),
        location: readStr(rec.location),
        emotion: readStr(rec.emotion),
        storyThread: readStr(rec.storyThread),
        linkedSceneId: readStr(rec.linkedSceneId),
        order: readNum(rec.order) ?? 0,
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  // Card ↔ character links (a many-to-many, so added after both exist).
  for (const { rec, id } of fresh("card")) {
    const linked = Array.isArray(rec.characters) ? (rec.characters as Rec[]) : [];
    const ids = linked
      .map((c) => plan.maps.character.get(String(c.id)))
      .filter((v): v is string => !!v);
    if (ids.length > 0) {
      await db.outlineCard.update({
        where: { id },
        data: { characters: { connect: ids.map((cid) => ({ id: cid })) } },
      });
    }
  }

  await createChunked(fresh("reference"), (chunk) =>
    db.reference.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        worldNoteId: parents.worldNoteId,
        seriesId: parents.seriesId,
        seasonId: parents.seasonId,
        beatId: parents.beatId,
        characterId: parents.characterId,
        kind: enumOf(rec.kind, ["LINK", "FILE"], "LINK"),
        url: str(rec.url, ""),
        label: str(rec.label, "Untitled"),
        note: readStr(rec.note),
        fileType: readStr(rec.fileType),
        fileSize: readNum(rec.fileSize),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  for (const { rec, id, parents } of fresh("draft")) {
    const oldLocked = readStr(rec.lastLockedVersionId);
    await db.draft.create({
      data: {
        id,
        projectId: parents.projectId!,
        content: (rec.content ?? { type: "screenplay", elements: [] }) as Prisma.InputJsonValue,
        wordCount: readNum(rec.wordCount) ?? 0,
        sceneNumbersLocked: readBool(rec.sceneNumbersLocked),
        lastLockedVersionId: oldLocked ? (plan.maps.version.get(oldLocked) ?? null) : null,
      },
    });
  }

  await createChunked(fresh("version"), (chunk) =>
    db.draftVersion.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        draftId: parents.draftId!,
        content: (rec.content ?? {}) as Prisma.InputJsonValue,
        wordCount: readNum(rec.wordCount) ?? 0,
        label: readStr(rec.label),
        revisionColor: readStr(rec.revisionColor),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );

  await createChunked(fresh("comment"), (chunk) =>
    db.draftComment.createMany({
      data: chunk.map(({ rec, id, parents }) => ({
        id,
        draftId: parents.draftId!,
        elementId: str(rec.elementId, ""),
        text: str(rec.text, ""),
        resolved: readBool(rec.resolved),
        createdAt: readDate(rec.createdAt),
      })),
    })
  );
}

function load(text: string, mode: string) {
  if (mode !== "missing" && mode !== "copies") throw new Error("Invalid restore mode");
  if (text.length > MAX_BYTES) throw new Error("That backup file is too large to restore here.");
  return { flat: parseBackup(text), mode: mode as RestoreMode };
}

// Shows what a restore would do, without changing anything.
export async function previewBackupFor(
  userId: string,
  text: string,
  mode: string
): Promise<RestoreSummary> {
  const { flat, mode: m } = load(text, mode);
  const plan = await buildPlan(prisma as unknown as Db, userId, flat, m);
  return summarize(plan, flat);
}

export async function restoreBackupFor(
  userId: string,
  text: string,
  mode: string
): Promise<RestoreSummary> {
  const { flat, mode: m } = load(text, mode);
  return prisma.$transaction(
    async (tx) => {
      const plan = await buildPlan(tx, userId, flat, m);
      await execute(tx, userId, plan, m);
      return summarize(plan, flat);
    },
    { timeout: 120_000, maxWait: 15_000 }
  );
}
