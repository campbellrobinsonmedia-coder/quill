// Season matrices: which storylines and which characters turn up in which
// episodes, and where one drops out of the season.

export type MatrixEpisode = {
  id: string;
  /** Episode number, or null if it hasn't got one. */
  number: number | null;
  cards: {
    title: string;
    storyThread: string | null;
    characters: { id: string; name: string }[];
  }[];
};

export type MatrixRow = {
  key: string;
  label: string;
  /** One cell per episode, in the order given: the scene titles there. */
  cells: string[][];
  total: number;
  flags: string[];
};

// "3", "3 and 4", "3, 4 and 5"
function list(numbers: number[]): string {
  if (numbers.length <= 1) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`;
}

// Runs of two or more episodes a row is missing from, between its first and
// last appearance, and a trailing absence at the end of the season. A single
// missed episode is ordinary; two in a row is a thread being dropped.
export function presenceFlags(present: boolean[], numbers: number[]): string[] {
  const flags: string[] = [];
  const first = present.indexOf(true);
  const last = present.lastIndexOf(true);
  if (first < 0) return flags;

  const appearances = present.filter(Boolean).length;
  if (appearances === 1 && present.length >= 3) {
    flags.push(`Only in episode ${numbers[first]}`);
  }

  let run: number[] = [];
  const closeRun = () => {
    if (run.length >= 2) flags.push(`Missing from episodes ${list(run)}`);
    run = [];
  };
  for (let i = first + 1; i < last; i++) {
    if (!present[i]) run.push(numbers[i]);
    else closeRun();
  }
  closeRun();

  const trailing = numbers.slice(last + 1);
  if (trailing.length >= 2) flags.push(`Not seen since episode ${numbers[last]}`);
  return flags;
}

function build(
  episodes: MatrixEpisode[],
  entries: Map<string, { label: string; cells: string[][] }>
): MatrixRow[] {
  const numbers = episodes.map((e, i) => e.number ?? i + 1);
  return Array.from(entries, ([key, { label, cells }]) => ({
    key,
    label,
    cells,
    total: cells.reduce((n, c) => n + c.length, 0),
    flags: presenceFlags(
      cells.map((c) => c.length > 0),
      numbers
    ),
  }));
}

export function buildThreadMatrix(episodes: MatrixEpisode[]): MatrixRow[] {
  const entries = new Map<string, { label: string; cells: string[][] }>();
  episodes.forEach((ep, col) => {
    for (const card of ep.cards) {
      const key = card.storyThread?.trim().toUpperCase();
      if (!key) continue;
      if (!entries.has(key)) {
        entries.set(key, { label: key, cells: episodes.map(() => [] as string[]) });
      }
      entries.get(key)!.cells[col].push(card.title);
    }
  });
  return build(episodes, entries).sort((a, b) => a.label.localeCompare(b.label));
}

// Busiest characters first.
export function buildCharacterMatrix(episodes: MatrixEpisode[]): MatrixRow[] {
  const entries = new Map<string, { label: string; cells: string[][] }>();
  episodes.forEach((ep, col) => {
    for (const card of ep.cards) {
      for (const ch of card.characters) {
        if (!entries.has(ch.id)) {
          entries.set(ch.id, { label: ch.name, cells: episodes.map(() => [] as string[]) });
        }
        entries.get(ch.id)!.cells[col].push(card.title);
      }
    }
  });
  return build(episodes, entries).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}
