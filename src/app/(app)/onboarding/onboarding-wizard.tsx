"use client";

import { useState, useTransition } from "react";
import { createOnboardingProject } from "@/app/actions/projects";

type Format = "feature-screenplay" | "short-story";

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<Format | null>(null);
  const [useSample, setUseSample] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(sample: boolean) {
    setUseSample(sample);
    if (!title.trim() || !format) return;
    startTransition(async () => {
      await createOnboardingProject({
        title: title.trim(),
        formatTemplate: format,
        useSample: sample,
      });
    });
  }

  const stepClass =
    "w-full rounded-md border border-neutral-300 px-3 py-3 text-left text-sm hover:border-neutral-500 dark:border-neutral-700";

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 p-6">
      {step === 0 && (
        <div className="space-y-3">
          <h1 className="text-lg font-semibold">What are you writing?</h1>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Working title"
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) setStep(1);
            }}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            disabled={!title.trim()}
            onClick={() => setStep(1)}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Next
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <h1 className="text-lg font-semibold">Screenplay or prose?</h1>
          <button
            onClick={() => {
              setFormat("feature-screenplay");
              setStep(2);
            }}
            className={stepClass}
          >
            <span className="font-medium">Screenplay</span>
            <p className="text-neutral-500">
              Industry-standard scene headings, dialogue, and action.
            </p>
          </button>
          <button
            onClick={() => {
              setFormat("short-story");
              setStep(2);
            }}
            className={stepClass}
          >
            <span className="font-medium">Prose</span>
            <p className="text-neutral-500">A plain, distraction-free page.</p>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h1 className="text-lg font-semibold">Start blank or from a sample?</h1>
          <button
            disabled={isPending}
            onClick={() => submit(false)}
            className={`${stepClass} disabled:opacity-60`}
          >
            <span className="font-medium">Blank page</span>
            <p className="text-neutral-500">Start from nothing.</p>
          </button>
          <button
            disabled={isPending}
            onClick={() => submit(true)}
            className={`${stepClass} disabled:opacity-60`}
          >
            <span className="font-medium">Sample scene</span>
            <p className="text-neutral-500">
              A short example already in place, so you can see the format
              before you write.
            </p>
          </button>
          {isPending && (
            <p className="text-sm text-neutral-500">
              {useSample ? "Setting up your sample…" : "Setting up…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
