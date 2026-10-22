import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { consumeToken, issueToken, peekToken, revokeTokens } from "@/lib/auth-tokens";
import { clearFailures, isLockedOut, LIMITS, recordFailure } from "@/lib/login-throttle";
import { HOUR, hitCount, recordHits, tooMany } from "@/lib/rate-limit";

// Needs a real database, so it only runs on request:
//   RUN_DB_TESTS=1 npx vitest run src/lib/auth-security.integration.test.ts
const run = process.env.RUN_DB_TESTS === "1";

const stamp = Date.now();
const email = `throttle-${stamp}@test.local`;
let userId = "";

describe.skipIf(!run)("account security (database)", () => {
  beforeAll(async () => {
    userId = (
      await prisma.user.create({ data: { email: `tokens-${stamp}@test.local`, passwordHash: "x" } })
    ).id;
  });

  afterAll(async () => {
    await prisma.loginAttempt.deleteMany({ where: { key: { contains: String(stamp) } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe("single-use link tokens", () => {
    it("works once and only once", async () => {
      const raw = await issueToken(userId, "RESET_PIN");
      expect(await peekToken(raw, "RESET_PIN")).toBe(true);
      expect(await consumeToken(raw, "RESET_PIN")).toBe(userId);
      expect(await consumeToken(raw, "RESET_PIN")).toBeNull();
      expect(await peekToken(raw, "RESET_PIN")).toBe(false);
    });

    it("is tied to its kind", async () => {
      const raw = await issueToken(userId, "VERIFY_EMAIL");
      expect(await consumeToken(raw, "RESET_PIN")).toBeNull();
      expect(await peekToken(raw, "VERIFY_EMAIL")).toBe(true);
      expect(await consumeToken(raw, "VERIFY_EMAIL")).toBe(userId);
    });

    it("stops working once it expires", async () => {
      const raw = await issueToken(userId, "RESET_PIN");
      await prisma.authToken.updateMany({
        where: { userId, kind: "RESET_PIN", usedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(await peekToken(raw, "RESET_PIN")).toBe(false);
      expect(await consumeToken(raw, "RESET_PIN")).toBeNull();
    });

    it("lets only the newest link work", async () => {
      const first = await issueToken(userId, "RESET_PIN");
      const second = await issueToken(userId, "RESET_PIN");
      expect(await consumeToken(first, "RESET_PIN")).toBeNull();
      expect(await consumeToken(second, "RESET_PIN")).toBe(userId);
    });

    it("can be revoked, and ignores junk", async () => {
      const raw = await issueToken(userId, "RESET_PIN");
      await revokeTokens(userId);
      expect(await consumeToken(raw, "RESET_PIN")).toBeNull();
      expect(await consumeToken("short", "RESET_PIN")).toBeNull();
      expect(await consumeToken("x".repeat(200), "RESET_PIN")).toBeNull();
    });

    it("never stores the raw token", async () => {
      const raw = await issueToken(userId, "RESET_PIN");
      const rows = await prisma.authToken.findMany({ where: { userId } });
      expect(rows.some((r) => r.tokenHash === raw)).toBe(false);
      expect(rows.every((r) => r.tokenHash.length === 64)).toBe(true);
    });

    it("is consumed exactly once when two requests race", async () => {
      const raw = await issueToken(userId, "RESET_PIN");
      const results = await Promise.all([
        consumeToken(raw, "RESET_PIN"),
        consumeToken(raw, "RESET_PIN"),
        consumeToken(raw, "RESET_PIN"),
      ]);
      expect(results.filter((r) => r === userId)).toHaveLength(1);
    });
  });

  describe("wrong-PIN lockout", () => {
    const home = `10.0.${stamp % 200}.1`;
    const elsewhere = `10.1.${stamp % 200}.1`;

    it("locks the network that keeps failing, but not the real user elsewhere", async () => {
      for (let i = 0; i < LIMITS.pair.max; i++) await recordFailure(email, home);

      expect(await isLockedOut(email, home, false)).toBe(true);
      // Someone failing on purpose from one address can't lock the owner out
      // from another.
      expect(await isLockedOut(email, elsewhere, false)).toBe(false);
    });

    it("forgives a network after a correct PIN", async () => {
      await clearFailures(email, home);
      expect(await isLockedOut(email, home, false)).toBe(false);
    });

    it("locks unknown devices when the account is attacked from many places, but not the owner's device", async () => {
      for (let i = 0; i < LIMITS.email.max; i++) {
        await recordFailure(email, `10.2.${i}.${stamp % 200}`);
      }
      const fresh = `10.3.0.${stamp % 200}`;
      expect(await isLockedOut(email, fresh, false)).toBe(true);
      expect(await isLockedOut(email, fresh, true)).toBe(false);
    });

    it("locks a network that sprays many accounts", async () => {
      const sprayer = `10.4.${stamp % 200}.9`;
      for (let i = 0; i < LIMITS.ip.max; i++) {
        await recordFailure(`victim-${i}-${stamp}@test.local`, sprayer);
      }
      expect(await isLockedOut(`another-${stamp}@test.local`, sprayer, true)).toBe(true);
    });
  });

  describe("rate limit counter", () => {
    it("counts hits inside the window and blocks at the limit", async () => {
      const key = `test:${stamp}`;
      expect(await tooMany(key, 3, HOUR)).toBe(false);
      await recordHits([key, key, key]);
      expect(await hitCount(key, HOUR)).toBe(3);
      expect(await tooMany(key, 3, HOUR)).toBe(true);
      expect(await tooMany(key, 4, HOUR)).toBe(false);
    });

    it("ignores hits older than the window", async () => {
      const key = `old:${stamp}`;
      await prisma.loginAttempt.create({
        data: { key, createdAt: new Date(Date.now() - 2 * HOUR) },
      });
      expect(await hitCount(key, HOUR)).toBe(0);
    });
  });
});
