import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import {
  clearFailures,
  clientIp,
  isLockedOut,
  recordFailure,
} from "@/lib/login-throttle";
import { DEVICE_COOKIE, readCookie, verifyDeviceToken } from "@/lib/trusted-device";
import { emailEnabled } from "@/lib/email";
import { finishAuthentication, relyingPartyFrom } from "@/lib/passkeys";
import { MINUTE, recordHits, tooMany } from "@/lib/rate-limit";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // Passkey sign-in: the browser has already asked the device to sign a
    // one-time challenge we issued; here we verify that signature.
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: { challengeId: {}, response: {} },
      authorize: async (credentials, request) => {
        const challengeId = credentials?.challengeId;
        const raw = credentials?.response;
        if (typeof challengeId !== "string" || typeof raw !== "string") return null;

        const failKey = `passkey-fail:${clientIp(request.headers) ?? "unknown"}`;
        if (await tooMany(failKey, 20, 15 * MINUTE)) throw new TooManyAttempts();

        try {
          const result = await finishAuthentication(
            challengeId,
            JSON.parse(raw) as AuthenticationResponseJSON,
            relyingPartyFrom(request.headers)
          );
          if (emailEnabled() && !result.emailVerifiedAt) throw new EmailNotVerified();
          return { id: result.userId, email: result.email };
        } catch (err) {
          if (err instanceof EmailNotVerified) throw err;
          await recordHits([failKey]);
          return null;
        }
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "PIN", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const normalizedEmail = email.toLowerCase().trim();
        const ip = clientIp(request.headers);

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        const trustedDevice = user
          ? verifyDeviceToken(readCookie(request.headers.get("cookie"), DEVICE_COOKIE), user.id)
          : false;

        if (await isLockedOut(normalizedEmail, ip, trustedDevice)) {
          throw new TooManyAttempts();
        }

        const valid = user
          ? await bcrypt.compare(password, user.passwordHash)
          : false;
        if (!user || !valid) {
          await recordFailure(normalizedEmail, ip);
          return null;
        }

        await clearFailures(normalizedEmail, ip);
        if (emailEnabled() && !user.emailVerifiedAt) throw new EmailNotVerified();
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
