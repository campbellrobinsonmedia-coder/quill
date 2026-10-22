"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { previewBackupFor, restoreBackupFor } from "@/lib/backup-restore";

export async function previewBackup(text: string, mode: string) {
  const userId = await requireUserId();
  return previewBackupFor(userId, text, mode);
}

export async function restoreBackup(text: string, mode: string) {
  const userId = await requireUserId();
  const summary = await restoreBackupFor(userId, text, mode);
  revalidatePath("/", "layout");
  return summary;
}
