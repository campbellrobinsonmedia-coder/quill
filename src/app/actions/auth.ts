"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const signupSchema = z.object({
  email: z.string().email(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export type SignupState = {
  error?: string;
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

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.user.create({
    data: { email, passwordHash },
  });

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
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await bcrypt.compare(parsed.data.currentPin, user.passwordHash);
  if (!valid) {
    return { error: "Current PIN is incorrect" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
}
