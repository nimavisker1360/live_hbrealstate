import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaSignature?: string;
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

const prismaSchemaSignature = Object.entries(Prisma)
  .filter(
    ([key, value]) =>
      key.endsWith("ScalarFieldEnum") &&
      typeof value === "object" &&
      value !== null,
  )
  .flatMap(([model, fields]) =>
    Object.entries(fields as Record<string, string>).map(
      ([key, value]) => `${model}.${key}:${value}`,
    ),
  )
  .sort()
  .join("|");

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaSignature !== prismaSchemaSignature
) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSignature = prismaSchemaSignature;
}
