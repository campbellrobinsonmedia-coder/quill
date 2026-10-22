"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, clearHits, HOUR, recordHits, tooMany } from "@/lib/rate-limit";
import { emailEnabled } from "@/lib/email";
import { consumeToken, revokeTokens } from "@/lib/auth-tokens";
import { sendPinResetEmail, sendVerificationEmail } from "@/lib/account-email";

const emailSchema = z.string().email().max(254);
const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export type EmailActionResult = { ok: boolean; error?: string };

// Asking for an email is limited per address and per network, and every
// request counts — whether or not the address has an account — so the response
// and its timing don't reveal which addresses are registered.
async function allowEmailRequest(kind: "verify" | "reset", email: string): Promise<boolean> {
  const ip = clientIp(await headers());
  const keys = [`${kind}:email:${email}`, `${kind}:ip:${ip ?? "unknown"}`];
  const [emailBlocked, ipBlocked] = await Promise.all([
    tooMany(keys[0], 3, HOUR),
    tooMany(keys[1], 10, HOUR),
  ]);
  await recordHits(keys);
  return !emailBlocked && !ipBlocked;
}

const GENERIC: EmailActionResult = { ok: true };

export async function resendVerification(rawEmail: string): Promise<EmailActionResult> {
  if (!emailEnabled()) return { ok: false, error: "Email isn't set up yet." };
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return GENERIC;
  const email = parsed.data.toLowerCase().trim();

  if (!(await allowEmailRequest("verify", email))) {
    return { ok: false, error: "Too many requests. Try again in an hour." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      console.error("verification email failed", err);
    }
  }
  return GENERIC;
}

export async function confirmEmail(token: string): Promise<EmailActionResult> {
  const userId = await consumeToken(token, "VERIFY_EMAIL");
  if (!userId) return { ok: false, error: "This link has expired or was already used." };
  await prisma.user.updateMany({
    where: { id: userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  return { ok: true };
}

export async function requestPinReset(rawEmail: string): Promise<EmailActionResult> {
  if (!emailEnabled()) return { ok: false, error: "PIN recovery isn't set up yet." };
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  const email = parsed.data.toLowerCase().trim();

  if (!(await allowEmailRequest("reset", email))) {
    return { ok: false, error: "Too many requests. Try again in an hour." };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    try {
      await sendPinResetEmail(user);
    } catch (err) {
      console.error("PIN reset email failed", err);
    }
  }
  return GENERIC;
}

export async function resetPin(token: string, newPin: string): Promise<EmailActionResult> {
  const pin = pinSchema.safeParse(newPin);
  if (!pin.success) return { ok: false, error: pin.error.issues[0]?.message ?? "Invalid PIN" };

  const userId = await consumeToken(token, "RESET_PIN");
  if (!userId) return { ok: false, error: "This link has expired or was already used." };

  const passwordHash = await bcrypt.hash(pin.data, 10);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: { email: true, emailVerifiedAt: true },
  });
  // Following a link sent to this address proves it's theirs.
  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  }
  await revokeTokens(userId);
  await clearHits([`email:${user.email}`]);
  return { ok: true };
}
