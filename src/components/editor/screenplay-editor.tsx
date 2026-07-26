"use client";

import { useEffect, useRef, useState } from "react";
import {
  ELEMENT_LABELS,
  makeId,
  nextEnterType,
  nextTabType,
  prevTabType,
  type ScreenplayContent,
  type ScreenplayElement,
  type ScreenplayElementType,
} from "@/lib/draft-content";

const UPPERCASE_TYPES: ScreenplayElementType[] = [
  "scene_heading",
  "character",
  "transition",
];

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
// that page-count and future PDF export rely on.
const PAGE_WIDTH_PX = 816;

export function ScreenplayEditor({
  content,
  onChange,
  characterNames = [],
}: {
  content: ScreenplayContent;
  onChange: (content: ScreenplayContent) => void;
  characterNames?: string[];
}) {
  const elements = content.elements;
  const refs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pendingFocus = useRef<{ id: string; pos: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageHeight, setPageHeight] = useState<number>();
  const [focusedId, setFocusedId] = useState<string | null>(null);

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
          {elements.map((el, index) => {
            const suggestions =
              el.type === "character" && focusedId === el.id
                ? characterSuggestions(el.text)
                : [];
            return (
              <div key={el.id} className="group relative">
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
                {suggestions.length > 0 && (
                  <div
                    className="absolute left-[2.2in] z-10 mt-0.5 min-w-[2in] rounded border border-neutral-200 bg-white text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900"
                    style={{ fontFamily: "system-ui, sans-serif" }}
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
