"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function setDailyWordGoal(goal: number | null) {
  const userId = await requireUserId();
  if (goal !== null && (!Number.isInteger(goal) || goal < 1 || goal > 100000)) {
    throw new Error("Enter a goal between 1 and 100,000 words");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { dailyWordGoal: goal },
  });
  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
