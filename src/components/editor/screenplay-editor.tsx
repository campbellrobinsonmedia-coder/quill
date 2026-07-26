"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeSceneNumbers,
  ELEMENT_LABELS,
  makeId,
  nextEnterType,
  nextTabType,
  prevTabType,
  type ScreenplayContent,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/draft-content";

export type CommentData = {
  id: string;
  elementId: string;
  text: string;
  resolved: boolean;
};

const UPPERCASE_TYPES: ScreenplayElementType[] = [
  "scene_heading",
  "character",
  "transition",
];

const DIALOGUE_CHAIN: ScreenplayElementType[] = ["character", "parenthetical", "dialogue"];

const TYPE_STYLES: Record<ScreenplayElementType, string> = {
  scene_heading: "uppercase",
  action: "",
  character: "ml-[2.2in] uppercase",
  parenthetical: "ml-[1.6in] max-w-[2in]",
  dialogue: "ml-[1in] max-w-[3.5in]",
  transition: "ml-auto text-right uppercase",
};

// Industry-standard US Letter page at 96dpi. Margins/indents above are
// fixed physical measurements, so on narrow viewports we scale the whole
// page down rather than reflowing it — reflowing would break the accuracy
// that page-count and PDF export rely on.
const PAGE_WIDTH_PX = 816;

function elementSignature(el: ScreenplayElement): string {
  return `${el.type}|${el.text}`;
}

function collectDialogueBlock(
  elements: ScreenplayElement[],
  start: number
): { block: ScreenplayElement[]; nextIndex: number } {
  const block = [elements[start]];
  let i = start + 1;
  while (i < elements.length && DIALOGUE_CHAIN.includes(elements[i].type)) {
    // only continue collecting parenthetical/dialogue that follow a character
    if (elements[i].type === "character") break;
    block.push(elements[i]);
    i++;
  }
  return { block, nextIndex: i };
}

export function ScreenplayEditor({
  content,
  onChange,
  characterNames = [],
  locationSuggestions = [],
  sceneNumbersLocked = false,
  revisionBaseline = null,
  hideAction = false,
  comments = [],
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
}: {
  content: ScreenplayContent;
  onChange: (content: ScreenplayContent) => void;
  characterNames?: string[];
  locationSuggestions?: string[];
  sceneNumbersLocked?: boolean;
  revisionBaseline?: ScreenplayContent | null;
  hideAction?: boolean;
  comments?: CommentData[];
  onCreateComment?: (elementId: string, text: string) => void;
  onUpdateComment?: (id: string, data: { text?: string; resolved?: boolean }) => void;
  onDeleteComment?: (id: string) => void;
}) {
  const elements = content.elements;
  const refs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pendingFocus = useRef<{ id: string; pos: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState<number>();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [openCommentFor, setOpenCommentFor] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    if (pendingFocus.current) {
      const { id, pos } = pendingFocus.current;
      const el = refs.current.get(id);
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
      pendingFocus.current = null;
    }
    for (const el of refs.current.values()) {
      resize(el);
    }
  }, [elements]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const update = () => setScale(Math.min(1, container.clientWidth / PAGE_WIDTH_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (pageRef.current) {
      setPageHeight(pageRef.current.scrollHeight * scale);
    }
  }, [scale, elements]);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function setElements(next: ScreenplayElement[]) {
    onChange({ type: "screenplay", elements: next });
  }

  function updateElement(index: number, text: string) {
    const el = elements[index];
    const value = UPPERCASE_TYPES.includes(el.type) ? text.toUpperCase() : text;
    const next = elements.slice();
    next[index] = { ...el, text: value };
    setElements(next);
  }

  function characterSuggestions(text: string): string[] {
    const query = text.trim().toUpperCase();
    if (!query) return [];
    return characterNames
      .filter((name) => {
        const upper = name.toUpperCase();
        return upper.startsWith(query) && upper !== query;
      })
      .slice(0, 5);
  }

  function sceneHeadingSuggestions(text: string): string[] {
    const query = text.trim().toUpperCase();
    if (!query) return ["INT. ", "EXT. "];
    const priorHeadings = Array.from(
      new Set(
        elements
          .filter((e) => e.type === "scene_heading" && e.text.trim())
          .map((e) => e.text.toUpperCase())
      )
    );
    const fromLocations = locationSuggestions.flatMap((loc) => [
      `INT. ${loc.toUpperCase()} - DAY`,
      `EXT. ${loc.toUpperCase()} - DAY`,
    ]);
    const all = Array.from(new Set([...priorHeadings, ...fromLocations]));
    return all.filter((h) => h.startsWith(query) && h !== query).slice(0, 6);
  }

  function pickSuggestion(index: number, name: string) {
    const el = elements[index];
    const next = elements.slice();
    next[index] = { ...el, text: name.toUpperCase() };
    setElements(next);
    setFocusedId(null);
  }

  function setType(index: number, type: ScreenplayElementType) {
    const el = elements[index];
    const text = UPPERCASE_TYPES.includes(type) ? el.text.toUpperCase() : el.text;
    const next = elements.slice();
    next[index] = { ...el, type, text };
    setElements(next);
  }

  function toggleOmitted(index: number) {
    const el = elements[index];
    const next = elements.slice();
    next[index] = { ...el, omitted: !el.omitted };
    setElements(next);
  }

  function pairDualDialogue(characterIndex: number) {
    const { nextIndex } = collectDialogueBlock(elements, characterIndex);
    if (elements[nextIndex]?.type !== "character") return;
    const groupId = makeId();
    const next = elements.slice();
    next[characterIndex] = { ...next[characterIndex], dualGroup: groupId };
    next[nextIndex] = { ...next[nextIndex], dualGroup: groupId };
    setElements(next);
  }

  function unpairDualDialogue(groupId: string) {
    const next = elements.map((el) =>
      el.dualGroup === groupId ? { ...el, dualGroup: null } : el
    );
    setElements(next);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = elements[index];
    const textarea = e.currentTarget;

    if (e.key === "Tab") {
      e.preventDefault();
      setType(index, e.shiftKey ? prevTabType(el.type) : nextTabType(el.type));
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const pos = textarea.selectionStart;
      const before = el.text.slice(0, pos);
      const after = el.text.slice(pos);
      const newId = makeId();
      const newType = nextEnterType(el.type);

      const next = elements.slice();
      next[index] = { ...el, text: before };
      next.splice(index + 1, 0, {
        id: newId,
        type: newType,
        text: UPPERCASE_TYPES.includes(newType) ? after.toUpperCase() : after,
      });
      pendingFocus.current = { id: newId, pos: 0 };
      setElements(next);
      return;
    }

    if (e.key === "Backspace") {
      const atStart = textarea.selectionStart === 0 && textarea.selectionEnd === 0;
      if (atStart && index > 0) {
        e.preventDefault();
        const prev = elements[index - 1];
        const mergedPos = prev.text.length;
        const next = elements.slice();
        next[index - 1] = { ...prev, text: prev.text + el.text };
        next.splice(index, 1);
        pendingFocus.current = { id: prev.id, pos: mergedPos };
        setElements(next);
      }
    }
  }

  const sceneNumbers = computeSceneNumbers(elements, sceneNumbersLocked);
  const baselineMap = new Map<string, string>();
  if (revisionBaseline) {
    for (const el of revisionBaseline.elements) baselineMap.set(el.id, elementSignature(el));
  }
  const commentsByElement = new Map<string, CommentData[]>();
  for (const c of comments) {
    const list = commentsByElement.get(c.elementId) ?? [];
    list.push(c);
    commentsByElement.set(c.elementId, list);
  }

  function isRevised(el: ScreenplayElement): boolean {
    if (!revisionBaseline) return false;
    return baselineMap.get(el.id) !== elementSignature(el);
  }

  function renderSuggestions(el: ScreenplayElement, index: number) {
    const suggestions =
      focusedId === el.id
        ? el.type === "character"
          ? characterSuggestions(el.text)
          : el.type === "scene_heading"
            ? sceneHeadingSuggestions(el.text)
            : []
        : [];
    if (suggestions.length === 0) return null;
    const left = el.type === "character" ? "2.2in" : "0";
    return (
      <div
        className="absolute z-10 mt-0.5 min-w-[2in] rounded border border-neutral-200 bg-white text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900"
        style={{ left, fontFamily: "system-ui, sans-serif" }}
      >
        {suggestions.map((name) => (
          <button
            key={name}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pickSuggestion(index, name);
            }}
            className="block w-full px-2 py-1 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {name}
          </button>
        ))}
      </div>
    );
  }

  function renderCommentButton(el: ScreenplayElement) {
    const elComments = commentsByElement.get(el.id) ?? [];
    const isOpen = openCommentFor === el.id;
    return (
      <div
        className="absolute -right-7 top-0"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <button
          type="button"
          onClick={() => {
            setOpenCommentFor(isOpen ? null : el.id);
            setNewCommentText("");
          }}
          className={`text-xs ${
            elComments.length > 0
              ? "text-amber-600"
              : "text-neutral-300 opacity-0 group-hover:opacity-100 dark:text-neutral-700"
          }`}
          title="Comments"
        >
          💬{elComments.length > 0 ? elComments.length : ""}
        </button>
        {isOpen && (
          <div className="absolute right-0 z-20 w-64 rounded border border-neutral-200 bg-white p-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {elComments.map((c) => (
              <div
                key={c.id}
                className={`mb-2 rounded border p-1.5 ${
                  c.resolved
                    ? "border-neutral-100 text-neutral-400 line-through dark:border-neutral-800"
                    : "border-neutral-200 dark:border-neutral-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{c.text}</p>
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={() => onUpdateComment?.(c.id, { resolved: !c.resolved })}
                    className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    {c.resolved ? "Unresolve" : "Resolve"}
                  </button>
                  <button
                    onClick={() => onDeleteComment?.(c.id)}
                    className="text-neutral-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a note…"
              rows={2}
              className="w-full resize-none rounded border border-neutral-300 p-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-950"
            />
            <button
              onClick={() => {
                if (!newCommentText.trim()) return;
                onCreateComment?.(el.id, newCommentText.trim());
                setNewCommentText("");
              }}
              className="mt-1 rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-neutral-900"
            >
              Add note
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderSingleElement(el: ScreenplayElement, index: number) {
    if (hideAction && el.type === "action") return null;
    return (
      <div key={el.id} className="group relative">
        {el.type === "scene_heading" && (
          <span
            className="absolute -left-10 select-none text-[10px] text-neutral-400"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {sceneNumbers.get(el.id)}
          </span>
        )}
        {isRevised(el) && (
          <span
            className="absolute -right-3 select-none text-neutral-400"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            *
          </span>
        )}
        <textarea
          ref={(node) => {
            if (node) refs.current.set(el.id, node);
            else refs.current.delete(el.id);
          }}
          value={el.text}
          onChange={(e) => updateElement(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onInput={(e) => resize(e.currentTarget)}
          onFocus={() => setFocusedId(el.id)}
          onBlur={() => setFocusedId((cur) => (cur === el.id ? null : cur))}
          rows={1}
          placeholder={ELEMENT_LABELS[el.type]}
          className={`block w-full resize-none overflow-hidden bg-transparent leading-relaxed outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700 ${TYPE_STYLES[el.type]}`}
        />
        {renderSuggestions(el, index)}
        {renderCommentButton(el)}
        {el.type === "scene_heading" && (
          <button
            type="button"
            onClick={() => toggleOmitted(index)}
            className="absolute -right-16 top-0 text-[10px] text-neutral-300 opacity-0 hover:text-neutral-600 group-hover:opacity-100 dark:text-neutral-700"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Omit
          </button>
        )}
        {el.type === "character" && !el.dualGroup && (
          <button
            type="button"
            onClick={() => pairDualDialogue(index)}
            className="absolute -right-24 top-0 text-[10px] text-neutral-300 opacity-0 hover:text-neutral-600 group-hover:opacity-100 dark:text-neutral-700"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Pair dual
          </button>
        )}
      </div>
    );
  }

  function renderElements() {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < elements.length) {
      const el = elements[i];

      if (el.type === "scene_heading" && el.omitted) {
        nodes.push(
          <div key={el.id} className="group relative flex items-center gap-2">
            <span
              className="select-none text-[10px] text-neutral-400"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {sceneNumbers.get(el.id)}
            </span>
            <p className="text-neutral-400 line-through">
              {el.text || ELEMENT_LABELS.scene_heading} — OMITTED
            </p>
            <button
              type="button"
              onClick={() => toggleOmitted(i)}
              className="text-[10px] text-neutral-400 opacity-0 hover:text-neutral-700 group-hover:opacity-100"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Restore
            </button>
          </div>
        );
        i++;
        while (i < elements.length && elements[i].type !== "scene_heading") i++;
        continue;
      }

      if (el.type === "character" && el.dualGroup) {
        const { nextIndex } = collectDialogueBlock(elements, i);
        const nextEl = elements[nextIndex];
        if (nextEl?.type === "character" && nextEl.dualGroup === el.dualGroup) {
          const blockA = collectDialogueBlock(elements, i);
          const blockB = collectDialogueBlock(elements, nextIndex);
          nodes.push(
            <div key={el.id} className="ml-[1in] flex gap-4">
              <div className="w-1/2">
                {blockA.block.map((be) =>
                  renderSingleElement(be, elements.indexOf(be))
                )}
              </div>
              <div className="w-1/2">
                {blockB.block.map((be) =>
                  renderSingleElement(be, elements.indexOf(be))
                )}
                <button
                  type="button"
                  onClick={() => unpairDualDialogue(el.dualGroup as string)}
                  className="text-[10px] text-neutral-400 hover:text-neutral-700"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  Unpair dual dialogue
                </button>
              </div>
            </div>
          );
          i = blockB.nextIndex;
          continue;
        }
      }

      nodes.push(renderSingleElement(el, i));
      i++;
    }
    return nodes;
  }

  return (
    <div ref={containerRef} className="w-full overflow-x-hidden">
      <div style={{ height: pageHeight }} className="flex justify-center">
        <div
          ref={pageRef}
          className="shrink-0 bg-white p-[1in] text-black shadow-sm dark:bg-neutral-950 dark:text-neutral-100"
          style={{
            width: PAGE_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: "12pt",
          }}
        >
          {renderElements()}
        </div>
      </div>
    </div>
  );
}
