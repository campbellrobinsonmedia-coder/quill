import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";
import type { PasskeyChallengeKind } from "@/generated/prisma/client";

// Passkeys (WebAuthn). The browser asks the person's device to make, then later
// to use, a key pair: we keep the public half, the device keeps the private
// half behind Face ID / a fingerprint / a screen lock. Signing in is the device
// signing a fresh random challenge from us, so there's nothing to guess,
// phish, or leak from our database.

export type RelyingParty = { id: string; name: string; origin: string };

const RP_NAME = "Quill";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const MAX_PASSKEYS = 10;

// Errors whose message is safe to show to the person.
export class PasskeyError extends Error {}

// Passkeys are bound to a domain, so the server has to know which one it's on.
// APP_URL pins it; otherwise it comes from the request host (on Vercel, the
// deployment's own domain). A passkey made on one domain won't work on another.
export function relyingPartyFrom(headers: Headers): RelyingParty {
  const fixed = process.env.APP_URL;
  if (fixed) {
    const url = new URL(fixed);
    return { id: url.hostname, name: RP_NAME, origin: url.origin };
  }
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return { id: host.replace(/:\d+$/, ""), name: RP_NAME, origin: `${proto}://${host}` };
}

async function storeChallenge(kind: PasskeyChallengeKind, challenge: string, userId?: string) {
  await prisma.passkeyChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const row = await prisma.passkeyChallenge.create({
    data: {
      kind,
      challenge,
      userId: userId ?? null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
    select: { id: true },
  });
  return row.id;
}

// Returns the challenge and deletes it in the same step, so each one works
// exactly once (replaying a captured response fails).
async function takeChallenge(
  id: string,
  kind: PasskeyChallengeKind,
  userId?: string
): Promise<string | null> {
  const row = await prisma.passkeyChallenge.findFirst({
    where: { id, kind, expiresAt: { gt: new Date() } },
  });
  if (!row) return null;
  if (userId !== undefined && row.userId !== userId) return null;
  const removed = await prisma.passkeyChallenge.deleteMany({ where: { id: row.id } });
  return removed.count === 1 ? row.challenge : null;
}

const EXPIRED = "That took too long or was already used. Please try again.";

export async function beginRegistration(
  user: { id: string; email: string },
  rp: RelyingParty
): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challengeId: string }> {
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });
  if (existing.length >= MAX_PASSKEYS) {
    throw new PasskeyError(`You can have up to ${MAX_PASSKEYS} passkeys. Remove one first.`);
  }
  const options = await generateRegistrationOptions({
    rpName: rp.name,
    rpID: rp.id,
    userName: user.email,
    userDisplayName: user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: c.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  const challengeId = await storeChallenge("REGISTER", options.challenge, user.id);
  return { options, challengeId };
}

export async function finishRegistration(
  userId: string,
  challengeId: string,
  response: RegistrationResponseJSON,
  name: string,
  rp: RelyingParty
): Promise<{ id: string }> {
  const expectedChallenge = await takeChallenge(challengeId, "REGISTER", userId);
  if (!expectedChallenge) throw new PasskeyError(EXPIRED);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: false,
    });
  } catch {
    throw new PasskeyError("That passkey couldn't be verified. Please try again.");
  }
  if (!verification.verified) throw new PasskeyError("That passkey couldn't be verified.");

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const duplicate = await prisma.passkey.findUnique({ where: { credentialId: credential.id } });
  if (duplicate) throw new PasskeyError("That passkey is already registered.");

  const created = await prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports ?? response.response.transports ?? [],
      name: name.trim().slice(0, 40) || "Passkey",
    },
    select: { id: true },
  });
  return created;
}

export async function beginAuthentication(
  rp: RelyingParty
): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challengeId: string }> {
  // No allow-list: the device offers whichever passkey it holds for this
  // site, so people don't have to type their email first.
  const options = await generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: "preferred",
  });
  const challengeId = await storeChallenge("AUTHENTICATE", options.challenge);
  return { options, challengeId };
}

export async function finishAuthentication(
  challengeId: string,
  response: AuthenticationResponseJSON,
  rp: RelyingParty
): Promise<{ userId: string; email: string; emailVerifiedAt: Date | null }> {
  const expectedChallenge = await takeChallenge(challengeId, "AUTHENTICATE");
  if (!expectedChallenge) throw new PasskeyError(EXPIRED);

  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  });
  if (!passkey) throw new PasskeyError("That passkey isn't registered here.");

  // A discoverable credential reports whose it is; it must match the owner.
  const handle = response.response.userHandle;
  if (handle && Buffer.from(handle, "base64url").toString("utf8") !== passkey.userId) {
    throw new PasskeyError("That passkey couldn't be verified.");
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports as never,
      },
      requireUserVerification: false,
    });
  } catch {
    throw new PasskeyError("That passkey couldn't be verified.");
  }
  if (!verification.verified) throw new PasskeyError("That passkey couldn't be verified.");

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      backedUp: verification.authenticationInfo.credentialBackedUp,
      lastUsedAt: new Date(),
    },
  });
  return {
    userId: passkey.user.id,
    email: passkey.user.email,
    emailVerifiedAt: passkey.user.emailVerifiedAt,
  };
}

export async function listPasskeys(userId: string) {
  return prisma.passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true, backedUp: true, deviceType: true },
  });
}

export async function deletePasskey(userId: string, passkeyId: string): Promise<boolean> {
  const removed = await prisma.passkey.deleteMany({ where: { id: passkeyId, userId } });
  return removed.count === 1;
}
