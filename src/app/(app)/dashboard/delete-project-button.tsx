"use client";

import { useRouter } from "next/navigation";
import { deleteProject } from "@/app/actions/projects";
import { DeleteButton } from "@/components/delete-button";

export function DeleteProjectButton({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) {
  const router = useRouter();
  return (
    <DeleteButton
      confirmMessage={`Permanently delete "${title}"? This cannot be undone.`}
      onDelete={async () => {
        await deleteProject(projectId);
        router.refresh();
      }}
    />
  );
}
