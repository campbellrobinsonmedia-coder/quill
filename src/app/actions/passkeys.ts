"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { clientIp, MINUTE, recordHits, tooMany } from "@/lib/rate-limit";
import {
  beginAuthentication,
  beginRegistration,
  deletePasskey,
  finishRegistration,
  PasskeyError,
  relyingPartyFrom,
} from "@/lib/passkeys";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

type Started<T> = { ok: true; options: T; challengeId: string } | { ok: false; error: string };

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof PasskeyError) return { ok: false, error: err.message };
  console.error("passkey error", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function startPasskeyRegistration(): Promise<
  Started<PublicKeyCredentialCreationOptionsJSON>
> {
  try {
    const userId = await requireUserId();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true },
    });
    const { options, challengeId } = await beginRegistration(user, relyingPartyFrom(await headers()));
    return { ok: true, options, challengeId };
  } catch (err) {
    return failure(err);
  }
}

export async function finishPasskeyRegistration(
  challengeId: string,
  response: RegistrationResponseJSON,
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    await finishRegistration(userId, challengeId, response, name, relyingPartyFrom(await headers()));
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

// Called from the log-in page, so it has no session; it's rate-limited per
// network so it can't be used to fill the challenges table.
export async function startPasskeyLogin(): Promise<
  Started<PublicKeyCredentialRequestOptionsJSON>
> {
  try {
    const h = await headers();
    const key = `passkey-start:${clientIp(h) ?? "unknown"}`;
    if (await tooMany(key, 30, 15 * MINUTE)) {
      return { ok: false, error: "Too many attempts. Try again in a few minutes." };
    }
    await recordHits([key]);
    const { options, challengeId } = await beginAuthentication(relyingPartyFrom(h));
    return { ok: true, options, challengeId };
  } catch (err) {
    return failure(err);
  }
}

export async function removePasskey(passkeyId: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const ok = await deletePasskey(userId, passkeyId);
  revalidatePath("/settings");
  return { ok };
}
