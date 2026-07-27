"use client";

import { useEffect, useRef, useState } from "react";
import type { DraftContent } from "@/lib/draft-content";

export function ReadAloud({
  content,
  className = "",
}: {
  content: DraftContent;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const voiceForCharacter = useRef<Map<string, SpeechSynthesisVoice>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  function voiceFor(character: string | null): SpeechSynthesisVoice | undefined {
    const voices = voicesRef.current;
    if (voices.length === 0) return undefined;
    if (!character) return voices[0];
    const existing = voiceForCharacter.current.get(character);
    if (existing) return existing;
    const assigned = voiceForCharacter.current.size;
    const voice = voices[assigned % voices.length];
    voiceForCharacter.current.set(character, voice);
    return voice;
  }

  function stop() {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }

  function play() {
    if (content.type !== "screenplay") return;
    window.speechSynthesis.cancel();
    voiceForCharacter.current.clear();

    let currentCharacter: string | null = null;
    const utterances: SpeechSynthesisUtterance[] = [];
    for (const el of content.elements) {
      if (!el.text.trim()) continue;
      if (el.type === "character") {
        currentCharacter = el.text;
        continue;
      }
      if (el.type === "parenthetical") continue;
      const utter = new SpeechSynthesisUtterance(el.text);
      utter.voice = voiceFor(el.type === "dialogue" ? currentCharacter : null) ?? null;
      utterances.push(utter);
    }

    utterances.forEach((u, i) => {
      if (i === utterances.length - 1) {
        u.onend = () => setIsPlaying(false);
      }
      window.speechSynthesis.speak(u);
    });
    setIsPlaying(utterances.length > 0);
  }

  return (
    <button
      onClick={isPlaying ? stop : play}
      className={`${className} ${
        isPlaying ? "text-neutral-900 dark:text-neutral-100" : ""
      }`}
    >
      {isPlaying ? "Stop reading" : "Read aloud"}
    </button>
  );
}
