import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

function keysFor(email: string, ip: string | null) {
  return {
    emailKey: `email:${email}`,
    ipKey: ip ? `ip:${ip}` : null,
  };
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return headers.get("x-real-ip");
}

async function countRecent(key: string, since: Date) {
  return prisma.loginAttempt.count({
    where: { key, createdAt: { gte: since } },
  });
}

export async function isLockedOut(email: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const { emailKey, ipKey } = keysFor(email, ip);
  const [emailFailures, ipFailures] = await Promise.all([
    countRecent(emailKey, since),
    ipKey ? countRecent(ipKey, since) : Promise.resolve(0),
  ]);
  return (
    emailFailures >= MAX_FAILURES_PER_EMAIL || ipFailures >= MAX_FAILURES_PER_IP
  );
}

export async function recordFailure(email: string, ip: string | null) {
  const { emailKey, ipKey } = keysFor(email, ip);
  await prisma.loginAttempt.createMany({
    data: [{ key: emailKey }, ...(ipKey ? [{ key: ipKey }] : [])],
  });
  // Opportunistic cleanup so the table doesn't grow without bound.
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - WINDOW_MS) } },
  });
}

export async function clearFailures(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { key: `email:${email}` } });
}
