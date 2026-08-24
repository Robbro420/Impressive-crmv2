/**
 * startup.ts — Idempotent schema migration + admin account provisioning.
 * Runs automatically before the HTTP server accepts traffic.
 *
 * Security notes:
 * - The initial password hash is read from the ADMIN_INITIAL_PASSWORD_HASH
 *   environment variable (a bcrypt cost-12 digest) so no credential material
 *   lives in source control.
 * - The hash is used ONLY when creating a new account (ON CONFLICT … DO UPDATE
 *   intentionally excludes password_hash) so user-changed passwords persist
 *   across server restarts.
 * - Any account whose username is not in APPROVED_USERNAMES is removed to
 *   prevent legacy/stale credentials from granting access.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Logger } from "pino";

// Canonical admin accounts — the only users allowed to log in.
const APPROVED_ACCOUNTS = [
  { username: "robbanbro@icloud.com", displayName: "Robban", gmailAddress: "robbanbro@icloud.com" },
  { username: "widuch@live.se",       displayName: "Widuch",  gmailAddress: "widuch@live.se"       },
] as const;

// Bcrypt-hash (cost 12) för initialt admin-lösenord, läses från miljön.
// Används bara när ett konto skapas första gången.
const INITIAL_HASH = process.env.ADMIN_INITIAL_PASSWORD_HASH ?? "";
if (!INITIAL_HASH) {
  throw new Error(
    "ADMIN_INITIAL_PASSWORD_HASH måste vara satt (bcrypt-hash för initialt admin-lösenord).",
  );
}

export async function runStartupMigration(logger: Logger): Promise<void> {
  // 1. Ensure users table exists (CREATE TABLE IF NOT EXISTS is idempotent).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      gmail_address TEXT,
      colleague_email TEXT,
      chat_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 1b. Ensure chat messages table exists (named "messages" per drizzle schema).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // 1c. Ensure calendar_logs table exists.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calendar_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, date)
    )
  `);

  // 1d. Add campaign date columns to orders table if they don't exist yet.
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_start TEXT
  `);
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS campaign_end TEXT
  `);

  // 1e. Gmail sync: dedupe imported Gmail messages by their Gmail message id.
  await db.execute(sql`
    ALTER TABLE emails ADD COLUMN IF NOT EXISTS gmail_id TEXT
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS emails_gmail_id_unique
    ON emails (gmail_id) WHERE gmail_id IS NOT NULL
  `);

  // 2. Remove any account that is not in the approved list.
  //    This retires legacy / test accounts (e.g. "robin", "robban") so they
  //    can no longer authenticate.
  const approvedUsernames = APPROVED_ACCOUNTS.map((a) => a.username);
  await db.execute(sql`
    DELETE FROM users
    WHERE username NOT IN (${sql.join(approvedUsernames.map((u) => sql`${u}`), sql`, `)})
  `);

  // 3. Provision each approved account.
  //    - ON CONFLICT: update display_name and gmail_address so they stay canonical.
  //    - password_hash is deliberately NOT updated: once set it belongs to the
  //      user and is only changed through the Settings page.
  for (const acc of APPROVED_ACCOUNTS) {
    await db.execute(sql`
      INSERT INTO users (username, password_hash, display_name, gmail_address)
      VALUES (${acc.username}, ${INITIAL_HASH}, ${acc.displayName}, ${acc.gmailAddress})
      ON CONFLICT (username) DO UPDATE
        SET display_name  = EXCLUDED.display_name,
            gmail_address = EXCLUDED.gmail_address
    `);
  }

  logger.info(
    { accounts: approvedUsernames },
    "Startup migration complete — admin accounts provisioned",
  );
}
