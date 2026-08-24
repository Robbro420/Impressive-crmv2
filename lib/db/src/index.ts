import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any;
let _pool: { end: () => Promise<unknown> };

if (process.env.DATABASE_URL.startsWith("pglite:")) {
  // Local development without a cloud database:
  //   DATABASE_URL=pglite://./.dev-db
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.DATABASE_URL.replace(/^pglite:\/\//, "");
  const client = new PGlite(dataDir);
  _db = drizzle(client, { schema });
  _pool = { end: () => client.close() };
} else {
  // Neon's serverless driver speaks WebSocket — required for transactions.
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { default: ws } = await import("ws");
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  _db = drizzle(pool, { schema });
  _pool = pool;
}

export const db = _db as import("drizzle-orm/neon-serverless").NeonDatabase<typeof schema>;
export const pool = _pool;

export * from "./schema";

// Re-export query operators so consumers share this package's drizzle-orm
// instance (pnpm resolves peer deps per package — mixing instances breaks types).
export { eq, ne, and, or, sql, desc, asc, ilike, inArray, isNotNull, isNull, lt, lte, gt, gte } from "drizzle-orm";
