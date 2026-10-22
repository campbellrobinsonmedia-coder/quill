import { prisma } from "@/lib/prisma";

// A small sliding-window counter on top of the LoginAttempt table: each "hit"
// is a row, and a window is just "how many rows for this key in the last N ms".

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
const RETENTION_MS = 24 * HOUR;

export async function hitCount(key: string, windowMs: number): Promise<number> {
  return prisma.loginAttempt.count({
    where: { key, createdAt: { gte: new Date(Date.now() - windowMs) } },
  });
}

export async function tooMany(key: string, max: number, windowMs: number): Promise<boolean> {
  return (await hitCount(key, windowMs)) >= max;
}

export async function recordHits(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.loginAttempt.createMany({ data: keys.map((key) => ({ key })) });
  // Opportunistic cleanup so the table doesn't grow without bound.
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
  });
}

export async function clearHits(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return headers.get("x-real-ip");
}
