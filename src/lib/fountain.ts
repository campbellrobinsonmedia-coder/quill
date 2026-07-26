import type { ScreenplayContent, ScreenplayElement } from "@/lib/draft-content";

function continuesDialogueBlock(
  prev: ScreenplayElement | undefined,
  current: ScreenplayElement
): boolean {
  if (!prev) return false;
  const prevContinues = ["character", "parenthetical", "dialogue"].includes(prev.type);
  const currentContinues = ["parenthetical", "dialogue"].includes(current.type);
  return prevContinues && currentContinues;
}

function elementToFountain(el: ScreenplayElement): string {
  switch (el.type) {
    case "scene_heading":
      return el.text;
    case "action":
      return el.text;
    case "character":
      return `@${el.text}`;
    case "parenthetical":
      return el.text.startsWith("(") ? el.text : `(${el.text})`;
    case "dialogue":
      return el.text;
    case "transition":
      return `> ${el.text}`;
  }
}

export function toFountain(
  content: ScreenplayContent,
  title: string
): string {
  const titlePage = [
    `Title: ${title}`,
    `Draft date: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`,
  ].join("\n");

  const lines: string[] = [];
  content.elements.forEach((el, i) => {
    const prev = content.elements[i - 1];
    if (i > 0 && !continuesDialogueBlock(prev, el)) {
      lines.push("");
    }
    if (el.text.trim() || el.type === "action") {
      lines.push(elementToFountain(el));
    }
  });

  return `${titlePage}\n\n${lines.join("\n")}\n`;
}
