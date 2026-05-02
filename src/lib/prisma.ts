import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

function normalizePostgresUrl(url: string) {
  if (/([?&])sslmode=/.test(url)) {
    return url.replace(/([?&])sslmode=[^&]*/, "$1sslmode=no-verify");
  }

  return `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify`;
}

const adapter = new PrismaPg({
  connectionString: normalizePostgresUrl(connectionString),
  ssl: {
    rejectUnauthorized: false,
  },
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
