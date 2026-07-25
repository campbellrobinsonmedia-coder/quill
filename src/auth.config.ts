import type { NextAuthConfig } from "next-auth";

// Edge/proxy-safe config: no providers or DB access here, so the proxy
// (which only needs to read the JWT) never has to import Prisma.
export default {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
} satisfies NextAuthConfig;
