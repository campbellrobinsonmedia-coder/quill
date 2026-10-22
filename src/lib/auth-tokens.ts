import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { AuthTokenKind } from "@/generated/prisma/client";

export const TOKEN_TTL_MS: Record<AuthTokenKind, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000,
  RESET_PIN: 60 * 60 * 1000,
};

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,100}$/;

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

// Creates a link token for a user and returns the raw value to put in the
// email. Any earlier unused token of the same kind stops working, so only the
// newest link is ever live.
export async function issueToken(userId: string, kind: AuthTokenKind): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, kind, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.authToken.create({
      data: {
        userId,
        kind,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]),
      },
    }),
  ]);
  return raw;
}

// True if the token is real, unused and unexpired — without using it up, so a
// page can decide whether to show its form.
export async function peekToken(raw: string, kind: AuthTokenKind): Promise<boolean> {
  if (!TOKEN_SHAPE.test(raw)) return false;
  const row = await prisma.authToken.findFirst({
    where: { tokenHash: hash(raw), kind, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return row !== null;
}

// Uses the token up and returns whose it was. The check-and-mark is a single
// UPDATE, so two requests racing on one link can't both succeed.
export async function consumeToken(raw: string, kind: AuthTokenKind): Promise<string | null> {
  if (!TOKEN_SHAPE.test(raw)) return null;
  const tokenHash = hash(raw);
  const claimed = await prisma.authToken.updateMany({
    where: { tokenHash, kind, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  return row?.userId ?? null;
}

export async function revokeTokens(userId: string): Promise<void> {
  await prisma.authToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}
