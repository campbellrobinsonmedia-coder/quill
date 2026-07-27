"use client";

import { useRouter } from "next/navigation";
import { deleteSeries } from "@/app/actions/series";
import { DeleteButton } from "@/components/delete-button";

export function DeleteSeriesButton({
  seriesId,
  title,
}: {
  seriesId: string;
  title: string;
}) {
  const router = useRouter();
  return (
    <DeleteButton
      confirmMessage={`Permanently delete "${title}"? Episodes will be kept as standalone scripts. This cannot be undone.`}
      onDelete={async () => {
        await deleteSeries(seriesId);
        router.refresh();
      }}
    />
  );
}
