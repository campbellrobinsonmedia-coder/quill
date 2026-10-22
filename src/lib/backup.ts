import { z } from "zod";

// Reads the file written by /api/export back into flat lists, one per kind of
// record. Pure and defensive: backups come from outside the app, so nothing
// is trusted beyond "it's a JSON object with Quill's shape".

export type Rec = Record<string, unknown>;

export const BACKUP_KINDS = [
  "series",
  "season",
  "project",
  "idea",
  "character",
  "card",
  "note",
  "beat",
  "reference",
  "draft",
  "version",
  "comment",
] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];

export const KIND_LABELS: Record<BackupKind, string> = {
  series: "Series",
  season: "Seasons",
  project: "Scripts & episodes",
  idea: "Ideas",
  character: "Characters",
  card: "Outline cards",
  note: "World notes",
  beat: "Beats",
  reference: "Links & files",
  draft: "Script drafts",
  version: "Draft versions",
  comment: "Script comments",
};

const recordList = z.array(z.record(z.string(), z.unknown())).default([]);

const backupSchema = z.object({
  app: z.literal("Quill"),
  formatVersion: z.number().optional(),
  exportedAt: z.string().optional(),
  ideas: recordList,
  projects: z
    .array(
      z
        .object({
          id: z.string(),
          characters: recordList,
          outlineCards: recordList,
          worldNotes: recordList,
          beats: recordList,
          draft: z
            .object({ id: z.string(), versions: recordList, comments: recordList })
            .passthrough()
            .nullable()
            .optional(),
        })
        .passthrough()
    )
    .default([]),
  series: z
    .array(
      z
        .object({
          id: z.string(),
          seasons: z
            .array(
              z
                .object({ id: z.string(), beats: recordList, references: recordList })
                .passthrough()
            )
            .default([]),
          characters: recordList,
          worldNotes: recordList,
          beats: recordList,
          references: recordList,
        })
        .passthrough()
    )
    .default([]),
});

export type FlatBackup = Record<BackupKind, Rec[]> & { exportedAt: string | null };

function pushUnique(target: Rec[], seen: Set<string>, rec: Rec) {
  const id = rec.id;
  if (typeof id !== "string" || seen.has(id)) return;
  seen.add(id);
  target.push(rec);
}

export function parseBackup(text: string): FlatBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("That doesn't look like a Quill backup file.");
  }
  const b = parsed.data;

  const flat = Object.fromEntries(BACKUP_KINDS.map((k) => [k, [] as Rec[]])) as Record<
    BackupKind,
    Rec[]
  >;
  const seen = Object.fromEntries(BACKUP_KINDS.map((k) => [k, new Set<string>()])) as Record<
    BackupKind,
    Set<string>
  >;
  const add = (kind: BackupKind, rec: Rec) => pushUnique(flat[kind], seen[kind], rec);

  // References hang off characters, notes, beats, series and seasons; each
  // carries the id of what it's attached to, so they can be listed flat.
  const addRefs = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const r of list) add("reference", r as Rec);
  };
  const withRefs = (kind: BackupKind, rec: Rec) => {
    const { references, ...rest } = rec;
    add(kind, rest);
    addRefs(references);
  };

  for (const idea of b.ideas) add("idea", idea);

  for (const series of b.series) {
    const { seasons, characters, worldNotes, beats, references, ...seriesRest } = series;
    add("series", seriesRest);
    for (const season of seasons) {
      const { beats: seasonBeats, references: seasonRefs, ...seasonRest } = season;
      add("season", seasonRest);
      for (const beat of seasonBeats) withRefs("beat", beat);
      addRefs(seasonRefs);
    }
    for (const c of characters) withRefs("character", c);
    for (const n of worldNotes) withRefs("note", n);
    for (const beat of beats) withRefs("beat", beat);
    addRefs(references);
  }

  for (const project of b.projects) {
    const { characters, outlineCards, worldNotes, beats, draft, ...projectRest } = project;
    add("project", projectRest);
    for (const c of characters) withRefs("character", c);
    for (const card of outlineCards) add("card", card);
    for (const n of worldNotes) withRefs("note", n);
    for (const beat of beats) withRefs("beat", beat);
    if (draft) {
      const { versions, comments, ...draftRest } = draft;
      add("draft", draftRest as Rec);
      for (const v of versions) add("version", v);
      for (const c of comments) add("comment", c);
    }
  }

  return { ...flat, exportedAt: b.exportedAt ?? null };
}

export function countBackup(flat: FlatBackup): Record<BackupKind, number> {
  return Object.fromEntries(BACKUP_KINDS.map((k) => [k, flat[k].length])) as Record<
    BackupKind,
    number
  >;
}

// Small typed readers for untrusted record fields.
export const readStr = (v: unknown): string | null => (typeof v === "string" ? v : null);
export const readNum = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
export const readBool = (v: unknown): boolean => v === true;
export const readDate = (v: unknown): Date | undefined => {
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
export const readTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
