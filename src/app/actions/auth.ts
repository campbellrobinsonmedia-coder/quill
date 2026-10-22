"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { requireUserId } from "@/lib/session";
import { emailEnabled } from "@/lib/email";
import { sendVerificationEmail } from "@/lib/account-email";
import { clientIp, HOUR, MINUTE, recordHits, tooMany } from "@/lib/rate-limit";
import {
  createDeviceToken,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
} from "@/lib/trusted-device";

const signupSchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export type SignupState = {
  error?: string;
  /** An email was sent and the account can't be used until the link is followed. */
  needsVerification?: boolean;
};

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Sign-ups are limited per network so the form can't be used to spray
  // accounts (or to burn CPU on password hashing).
  const ip = clientIp(await headers());
  const signupKey = `signup:${ip ?? "unknown"}`;
  if (await tooMany(signupKey, 5, HOUR)) {
    return { error: "Too many accounts created from this network. Try again later." };
  }
  await recordHits([signupKey]);

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.pin, 10);
  // With email set up, the address has to be confirmed before the account can
  // be used. Without it there's no way to confirm, so don't hold the account.
  const verifying = emailEnabled();
  const user = await prisma.user.create({
    data: { email, passwordHash, emailVerifiedAt: verifying ? null : new Date() },
  });

  if (verifying) {
    try {
      await sendVerificationEmail(user);
    } catch (err) {
      console.error("verification email failed", err);
    }
    return { needsVerification: true };
  }
  return {};
}

const changePinSchema = z.object({
  currentPin: z.string().min(1, "Enter your current PIN"),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be exactly 4 digits"),
});

export type ChangePinState = {
  error?: string;
  success?: boolean;
};

export async function changePinAction(
  _prevState: ChangePinState,
  formData: FormData
): Promise<ChangePinState> {
  const parsed = changePinSchema.safeParse({
    currentPin: formData.get("currentPin"),
    newPin: formData.get("newPin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  // Someone on a borrowed, signed-in device shouldn't be able to guess the
  // current PIN here without limit either.
  const pinKey = `pin-change:${userId}`;
  if (await tooMany(pinKey, 5, 15 * MINUTE)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await bcrypt.compare(parsed.data.currentPin, user.passwordHash);
  if (!valid) {
    await recordHits([pinKey]);
    return { error: "Current PIN is incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
}

// Marks this browser as one the signed-in user has used, so a brute-force
// attempt from elsewhere can't lock them out (see login-throttle.ts).
export async function rememberDevice() {
  const userId = await requireUserId();
  const store = await cookies();
  store.set(DEVICE_COOKIE, createDeviceToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}
