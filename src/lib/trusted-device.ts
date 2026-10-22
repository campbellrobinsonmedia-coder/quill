import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// A signed, long-lived cookie set after a successful sign-in. Presenting it
// marks the device as one the account owner has used before, which exempts it
// from the "many failures from anywhere" lockout (see login-throttle.ts).

export const DEVICE_COOKIE = "qd";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function key(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(`device:${payload}`).digest("base64url");
}

export function createDeviceToken(userId: string): string {
  const payload = `${userId}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyDeviceToken(token: string | undefined | null, userId: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenUser, nonce, signature] = parts;
  if (tokenUser !== userId || !nonce) return false;
  const expected = Buffer.from(sign(`${tokenUser}.${nonce}`));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
