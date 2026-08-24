import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

// Local development: DATABASE_URL=pglite://./.dev-db (see lib/db/src/index.ts)
const isPglite = url.startsWith("pglite:");

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  ...(isPglite
    ? { driver: "pglite" as const, dbCredentials: { url: url.replace(/^pglite:\/\//, "") } }
    : { dbCredentials: { url } }),
});
