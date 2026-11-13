// Storylines are free text on a scene: a letter (A, B, C) or a name ("The
// heist"). Letters and names are matched ignoring case, so "heist" and "Heist"
// are the same storyline.

export const storylineKey = (raw: string | null | undefined): string => (raw ?? "").trim().toUpperCase();

// How it's written: short tags in capitals, names as the writer typed them.
export function storylineName(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  return t.length <= 2 ? t.toUpperCase() : t;
}

// "Storyline A" for a letter, the name itself for a named storyline.
export function storylineTitle(raw: string): string {
  const name = storylineName(raw);
  return name.length <= 2 ? `Storyline ${name}` : name;
}
