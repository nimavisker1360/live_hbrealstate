import "dotenv/config";
import { defineConfig } from "prisma/config";

function normalizePostgresUrl(url?: string) {
  if (!url) {
    return url;
  }

  if (/([?&])sslmode=/.test(url)) {
    return url.replace(/([?&])sslmode=[^&]*/, "$1sslmode=no-verify");
  }

  return `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalizePostgresUrl(
      process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    ),
  },
});
