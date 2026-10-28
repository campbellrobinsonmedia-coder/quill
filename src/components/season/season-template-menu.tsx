"use client";

import { useTransition } from "react";
import { Menu, MENU_ITEM } from "@/components/menu";
import { useToast } from "@/components/toast";
import { applySeasonBeatTemplate } from "@/app/actions/beats";
import { SEASON_BEAT_TEMPLATES } from "@/lib/beat-templates";

export function SeasonTemplateMenu({ seasonId }: { seasonId: string }) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function apply(templateId: string) {
    startTransition(async () => {
      try {
        await applySeasonBeatTemplate(seasonId, templateId);
        toast.success("Arc beats added");
      } catch {
        toast.error("Couldn't add the template — try again");
      }
    });
  }

  return (
    <Menu
      label={isPending ? "Adding…" : "Arc template"}
      buttonClassName="inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
    >
      <p className="px-3 pb-1 pt-2 text-xs text-neutral-500">Add a ready-made season arc</p>
      {SEASON_BEAT_TEMPLATES.map((t) => (
        <button key={t.id} type="button" className={MENU_ITEM} disabled={isPending} onClick={() => apply(t.id)}>
          {t.label}
          <span className="block text-xs text-neutral-500">{t.beats.length} beats</span>
        </button>
      ))}
    </Menu>
  );
}
