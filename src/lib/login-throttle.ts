import {
  clearHits,
  clientIp,
  hitCount,
  HOUR,
  MINUTE,
  recordHits,
} from "@/lib/rate-limit";

export { clientIp };

// Wrong-PIN limits. A 4-digit PIN has only 10,000 values, so guessing has to
// be slow — but a limit keyed on the email alone would let anyone lock a real
// user out just by failing on purpose. So the limits are layered:
//
//   pair  one email from one network: a handful of tries, then wait
//   ip    one network across all emails: stops it fishing through accounts
//   email one email from anywhere: a high backstop against a spread-out
//         attack — but devices the user has signed in from before (they carry
//         a signed cookie) are exempt, so an attacker can't lock the owner out
export const LIMITS = {
  pair: { max: 5, windowMs: 15 * MINUTE },
  ip: { max: 20, windowMs: 15 * MINUTE },
  email: { max: 25, windowMs: HOUR },
} as const;

export type FailureCounts = { pair: number; ip: number; email: number };

export function isLocked(counts: FailureCounts, trustedDevice: boolean): boolean {
  return (
    counts.pair >= LIMITS.pair.max ||
    counts.ip >= LIMITS.ip.max ||
    (!trustedDevice && counts.email >= LIMITS.email.max)
  );
}

const pairKey = (email: string, ip: string | null) => `pair:${email}|${ip ?? "unknown"}`;
const ipKey = (ip: string) => `ip:${ip}`;
const emailKey = (email: string) => `email:${email}`;

export async function isLockedOut(
  email: string,
  ip: string | null,
  trustedDevice: boolean
): Promise<boolean> {
  const [pair, ipCount, emailCount] = await Promise.all([
    hitCount(pairKey(email, ip), LIMITS.pair.windowMs),
    ip ? hitCount(ipKey(ip), LIMITS.ip.windowMs) : Promise.resolve(0),
    hitCount(emailKey(email), LIMITS.email.windowMs),
  ]);
  return isLocked({ pair, ip: ipCount, email: emailCount }, trustedDevice);
}

export async function recordFailure(email: string, ip: string | null) {
  await recordHits([pairKey(email, ip), emailKey(email), ...(ip ? [ipKey(ip)] : [])]);
}

// A correct PIN forgives that network's earlier misses. It deliberately leaves
// the all-networks counter alone, so one lucky guess can't reset an attack.
export async function clearFailures(email: string, ip: string | null) {
  await clearHits([pairKey(email, ip)]);
}
