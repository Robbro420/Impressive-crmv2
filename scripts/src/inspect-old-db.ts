/** Engångs: inspektera gamla Replit-databasen inför migrering. */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const url = process.env.OLD_DATABASE_URL;
if (!url) throw new Error("OLD_DATABASE_URL krävs");

const pool = new Pool({ connectionString: url });

async function main() {
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`,
  );
  for (const { table_name } of tables.rows) {
    const count = await pool.query(`SELECT count(*)::int AS n FROM "${table_name}"`);
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
      [table_name],
    );
    console.log(
      `${table_name}: ${count.rows[0].n} rader — ${cols.rows.map((c) => c.column_name).join(", ")}`,
    );
  }
}

main().then(() => pool.end()).catch((e) => { console.error(e); process.exitCode = 1; return pool.end(); });
