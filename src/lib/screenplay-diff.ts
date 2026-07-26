import type { DraftContent, ScreenplayElement } from "@/lib/draft-content";

export type DiffRow = {
  status: "unchanged" | "added" | "removed" | "changed";
  before?: string;
  after?: string;
  elementType: string;
};

function toElements(content: DraftContent): ScreenplayElement[] {
  if (content.type === "screenplay") return content.elements;
  // Treat prose as a single pseudo-element list split by paragraph so the
  // same id-based diff works for prose projects too.
  return content.text.split(/\n{2,}/).map((text, i) => ({
    id: `p${i}`,
    type: "action",
    text,
  }));
}

export function diffDraftContent(a: DraftContent, b: DraftContent): DiffRow[] {
  const elementsA = toElements(a);
  const elementsB = toElements(b);
  const mapB = new Map(elementsB.map((el) => [el.id, el]));
  const seen = new Set<string>();
  const rows: DiffRow[] = [];

  for (const elA of elementsA) {
    const elB = mapB.get(elA.id);
    if (!elB) {
      rows.push({ status: "removed", before: elA.text, elementType: elA.type });
    } else {
      seen.add(elA.id);
      if (elA.text !== elB.text || elA.type !== elB.type) {
        rows.push({
          status: "changed",
          before: elA.text,
          after: elB.text,
          elementType: elB.type,
        });
      } else {
        rows.push({ status: "unchanged", before: elA.text, elementType: elA.type });
      }
    }
  }

  for (const elB of elementsB) {
    if (!seen.has(elB.id)) {
      rows.push({ status: "added", after: elB.text, elementType: elB.type });
    }
  }

  return rows;
}
