import { computeSceneNumbers, type ScreenplayContent, type ScreenplayElement } from "@/lib/draft-content";

export type FountainComment = { elementId: string; text: string };

export type FountainOptions = {
  title: string;
  author?: string | null;
  contact?: string | null;
  basedOn?: string | null;
  sceneNumbersLocked?: boolean;
  comments?: FountainComment[];
};

function continuesDialogueBlock(
  prev: ScreenplayElement | undefined,
  current: ScreenplayElement
): boolean {
  if (!prev) return false;
  const prevContinues = ["character", "parenthetical", "dialogue"].includes(prev.type);
  const currentContinues = ["parenthetical", "dialogue"].includes(current.type);
  return prevContinues && currentContinues;
}

function elementToFountain(el: ScreenplayElement, sceneNumber?: string): string {
  switch (el.type) {
    case "scene_heading":
      return sceneNumber ? `${el.text} #${sceneNumber}#` : el.text;
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

export function toFountain(content: ScreenplayContent, options: FountainOptions): string {
  const { title, author, contact, basedOn, comments = [] } = options;
  const sceneNumbers = computeSceneNumbers(content.elements, !!options.sceneNumbersLocked);
  const commentsByElement = new Map<string, string[]>();
  for (const c of comments) {
    const list = commentsByElement.get(c.elementId) ?? [];
    list.push(c.text);
    commentsByElement.set(c.elementId, list);
  }

  const titlePageLines = [`Title: ${title}`];
  if (author) titlePageLines.push("Credit: Written by", `Author: ${author}`);
  if (basedOn) titlePageLines.push(`Source: ${basedOn}`);
  if (contact) titlePageLines.push(`Contact: ${contact.replace(/\n/g, ", ")}`);
  titlePageLines.push(
    `Draft date: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`
  );

  const lines: string[] = [];
  let i = 0;
  const elements = content.elements;
  while (i < elements.length) {
    const el = elements[i];

    if (el.type === "scene_heading" && el.omitted) {
      const prev = elements[i - 1];
      if (i > 0 && !continuesDialogueBlock(prev, el)) lines.push("");
      const num = sceneNumbers.get(el.id);
      lines.push(elementToFountain(el, num));
      lines.push("(OMITTED)");
      i++;
      while (i < elements.length && elements[i].type !== "scene_heading") i++;
      continue;
    }

    const prev = elements[i - 1];
    if (i > 0 && !continuesDialogueBlock(prev, el)) {
      lines.push("");
    }
    if (el.text.trim() || el.type === "action") {
      const num = el.type === "scene_heading" ? sceneNumbers.get(el.id) : undefined;
      lines.push(elementToFountain(el, num));
      const notes = commentsByElement.get(el.id);
      if (notes) {
        for (const note of notes) lines.push(`[[${note}]]`);
      }
    }
    i++;
  }

  return `${titlePageLines.join("\n")}\n\n${lines.join("\n")}\n`;
}
