import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  beginAuthentication,
  beginRegistration,
  deletePasskey,
  finishAuthentication,
  finishRegistration,
  listPasskeys,
  MAX_PASSKEYS,
  PasskeyError,
  relyingPartyFrom,
  type RelyingParty,
} from "@/lib/passkeys";
import { SoftwareAuthenticator, tamper } from "@/lib/test-support/software-authenticator";

// Real cryptography against a real database, with a software stand-in for the
// phone/laptop. Runs on request:
//   RUN_DB_TESTS=1 npx vitest run src/lib/passkeys.integration.test.ts
const run = process.env.RUN_DB_TESTS === "1";

const stamp = Date.now();
const rp: RelyingParty = { id: "localhost", name: "Quill", origin: "http://localhost:3000" };
const users: string[] = [];

async function makeUser(label: string) {
  const user = await prisma.user.create({
    data: { email: `passkey-${label}-${stamp}@test.local`, passwordHash: "x", emailVerifiedAt: new Date() },
  });
  users.push(user.id);
  return user;
}

async function register(user: { id: string; email: string }, auth: SoftwareAuthenticator, name = "Test device") {
  const { options, challengeId } = await beginRegistration(user, rp);
  return finishRegistration(user.id, challengeId, auth.register(options), name, rp);
}

describe.skipIf(!run)("passkeys (database, software authenticator)", () => {
  afterAll(async () => {
    await prisma.passkeyChallenge.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  describe("registration", () => {
    it("stores the public key and metadata, never anything secret", async () => {
      const user = await makeUser("reg");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id, synced: true });
      const created = await register(user, auth, "  My phone  ");

      const row = await prisma.passkey.findUniqueOrThrow({ where: { id: created.id } });
      expect(row.credentialId).toBe(auth.id);
      expect(row.name).toBe("My phone");
      expect(row.backedUp).toBe(true);
      expect(row.deviceType).toBe("multiDevice");
      expect(row.counter).toBe(BigInt(0));
      expect(row.publicKey.length).toBeGreaterThan(30);
      expect(await listPasskeys(user.id)).toHaveLength(1);
    });

    it("asks the device not to register the same passkey twice", async () => {
      const user = await makeUser("dup");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginRegistration(user, rp);
      expect(options.excludeCredentials?.map((c) => c.id)).toContain(auth.id);
      // Even if a device ignores that, the duplicate is refused.
      await expect(finishRegistration(user.id, challengeId, auth.register(options), "again", rp)).rejects.toThrow(
        /already registered/
      );
    });

    it("refuses a response made for a different site", async () => {
      const user = await makeUser("origin");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      const { options, challengeId } = await beginRegistration(user, rp);
      const response = auth.register(options, { origin: "https://evil.example" });
      await expect(finishRegistration(user.id, challengeId, response, "x", rp)).rejects.toThrow(PasskeyError);
      expect(await listPasskeys(user.id)).toHaveLength(0);
    });

    it("refuses a credential scoped to another domain", async () => {
      const user = await makeUser("rpid");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      const { options, challengeId } = await beginRegistration(user, rp);
      const response = auth.register(options, { rpId: "evil.example" });
      await expect(finishRegistration(user.id, challengeId, response, "x", rp)).rejects.toThrow(PasskeyError);
    });

    it("only accepts a challenge once, from the user it was issued to", async () => {
      const owner = await makeUser("owner");
      const other = await makeUser("other");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: owner.id });

      const first = await beginRegistration(owner, rp);
      const response = auth.register(first.options);
      await expect(finishRegistration(other.id, first.challengeId, response, "stolen", rp)).rejects.toThrow(
        /took too long|already used/
      );

      await finishRegistration(owner.id, first.challengeId, response, "ok", rp).catch(() => undefined);
      // The first (failed, wrong-user) attempt didn't use it up, but a successful one does.
      await expect(finishRegistration(owner.id, first.challengeId, response, "replay", rp)).rejects.toThrow(
        /took too long|already used/
      );
    });

    it("stops at the passkey limit", async () => {
      const user = await makeUser("limit");
      for (let i = 0; i < MAX_PASSKEYS; i++) {
        await register(user, new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id }));
      }
      await expect(beginRegistration(user, rp)).rejects.toThrow(/up to/);
    });
  });

  describe("signing in", () => {
    it("signs the right user in and records the use", async () => {
      const user = await makeUser("login");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginAuthentication(rp);
      expect(options.allowCredentials ?? []).toHaveLength(0);
      const result = await finishAuthentication(challengeId, auth.authenticate(options, { counter: 1 }), rp);
      expect(result.userId).toBe(user.id);
      expect(result.email).toBe(user.email);

      const row = await prisma.passkey.findUniqueOrThrow({ where: { credentialId: auth.id } });
      expect(row.counter).toBe(BigInt(1));
      expect(row.lastUsedAt).not.toBeNull();
    });

    it("rejects a replayed response", async () => {
      const user = await makeUser("replay");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginAuthentication(rp);
      const response = auth.authenticate(options, { counter: 1 });
      await finishAuthentication(challengeId, response, rp);
      await expect(finishAuthentication(challengeId, response, rp)).rejects.toThrow(/took too long|already used/);
    });

    it("rejects a tampered signature", async () => {
      const user = await makeUser("tamper");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginAuthentication(rp);
      const response = auth.authenticate(options);
      response.response.signature = tamper(response.response.signature);
      await expect(finishAuthentication(challengeId, response, rp)).rejects.toThrow(PasskeyError);
    });

    it("rejects the wrong site and the wrong domain", async () => {
      const user = await makeUser("site");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const a = await beginAuthentication(rp);
      await expect(
        finishAuthentication(a.challengeId, auth.authenticate(a.options, { origin: "https://evil.example" }), rp)
      ).rejects.toThrow(PasskeyError);

      const b = await beginAuthentication(rp);
      await expect(
        finishAuthentication(b.challengeId, auth.authenticate(b.options, { rpId: "evil.example" }), rp)
      ).rejects.toThrow(PasskeyError);
    });

    it("rejects a credential that isn't registered", async () => {
      const user = await makeUser("unknown");
      const stranger = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      const { options, challengeId } = await beginAuthentication(rp);
      await expect(finishAuthentication(challengeId, stranger.authenticate(options), rp)).rejects.toThrow(
        /isn't registered/
      );
    });

    it("rejects a response that claims someone else's user handle", async () => {
      const user = await makeUser("handle");
      const victim = await makeUser("victim");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginAuthentication(rp);
      const response = auth.authenticate(options, { userHandle: victim.id });
      await expect(finishAuthentication(challengeId, response, rp)).rejects.toThrow(PasskeyError);
    });

    it("rejects an expired challenge", async () => {
      const user = await makeUser("expired");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const { options, challengeId } = await beginAuthentication(rp);
      await prisma.passkeyChallenge.update({
        where: { id: challengeId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(finishAuthentication(challengeId, auth.authenticate(options), rp)).rejects.toThrow(
        /took too long|already used/
      );
    });

    it("won't accept a registration challenge for signing in", async () => {
      const user = await makeUser("kind");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const reg = await beginRegistration(user, rp);
      const response = auth.authenticate({ ...reg.options, rpId: rp.id } as never);
      await expect(finishAuthentication(reg.challengeId, response, rp)).rejects.toThrow(/took too long|already used/);
    });

    it("detects a cloned authenticator by its counter going backwards", async () => {
      const user = await makeUser("counter");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id });
      await register(user, auth);

      const first = await beginAuthentication(rp);
      await finishAuthentication(first.challengeId, auth.authenticate(first.options, { counter: 5 }), rp);

      const second = await beginAuthentication(rp);
      await expect(
        finishAuthentication(second.challengeId, auth.authenticate(second.options, { counter: 3 }), rp)
      ).rejects.toThrow(PasskeyError);
    });

    it("accepts synced passkeys whose counter stays at zero", async () => {
      const user = await makeUser("synced");
      const auth = new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: user.id, synced: true });
      await register(user, auth);
      for (let i = 0; i < 2; i++) {
        const { options, challengeId } = await beginAuthentication(rp);
        const result = await finishAuthentication(challengeId, auth.authenticate(options, { counter: 0 }), rp);
        expect(result.userId).toBe(user.id);
      }
    });
  });

  describe("managing passkeys", () => {
    it("only lets the owner remove a passkey", async () => {
      const owner = await makeUser("rm-owner");
      const other = await makeUser("rm-other");
      const created = await register(
        owner,
        new SoftwareAuthenticator({ rpId: rp.id, origin: rp.origin, userHandle: owner.id })
      );
      expect(await deletePasskey(other.id, created.id)).toBe(false);
      expect(await listPasskeys(owner.id)).toHaveLength(1);
      expect(await deletePasskey(owner.id, created.id)).toBe(true);
      expect(await listPasskeys(owner.id)).toHaveLength(0);
    });
  });

  describe("relying party", () => {
    it("is read from the request host", () => {
      const prev = process.env.APP_URL;
      delete process.env.APP_URL;
      expect(relyingPartyFrom(new Headers({ host: "localhost:3000" }))).toMatchObject({
        id: "localhost",
        origin: "http://localhost:3000",
      });
      expect(
        relyingPartyFrom(new Headers({ "x-forwarded-host": "quill.example.com", "x-forwarded-proto": "https" }))
      ).toMatchObject({ id: "quill.example.com", origin: "https://quill.example.com" });
      if (prev) process.env.APP_URL = prev;
    });
  });
});
