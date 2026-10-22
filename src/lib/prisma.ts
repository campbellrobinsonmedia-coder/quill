import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// pg already treats sslmode=prefer/require/verify-ca as verify-full and logs a
// warning about it on every cold start. Spelling it out keeps the same
// behavior without the warning.
function normalizeConnectionString(url: string | undefined) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const mode = parsed.searchParams.get("sslmode");
    if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    // Not a parseable URL; hand it to pg unchanged.
  }
  return url;
}

const adapter = new PrismaPg({
  connectionString: normalizeConnectionString(process.env.DATABASE_URL),
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
