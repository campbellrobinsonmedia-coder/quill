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

class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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

        if (await isLockedOut(normalizedEmail, ip)) {
          throw new TooManyAttempts();
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        const valid = user
          ? await bcrypt.compare(password, user.passwordHash)
          : false;
        if (!user || !valid) {
          await recordFailure(normalizedEmail, ip);
          return null;
        }

        await clearFailures(normalizedEmail);
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
