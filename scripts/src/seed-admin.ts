/**
 * seed-admin.ts — Provisionerar det ENDA administratörskontot.
 *
 * Körs manuellt (en gång, samt efter behov):
 *   ADMIN_PASSWORD=... pnpm seed
 *
 * Miljövariabler:
 *   DATABASE_URL    (krävs)   — Neon Postgres-anslutning
 *   ADMIN_EMAIL     (valfri)  — inloggningsadress, default robbanbro@icloud.com
 *   ADMIN_PASSWORD  (krävs vid första körning) — initialt lösenord i klartext,
 *                    hashas med bcrypt cost 12 innan det sparas.
 *
 * Beteende:
 *   - Skapar kontot om det saknas.
 *   - Rör ALDRIG lösenordet på ett befintligt konto (byts via Inställningar).
 *   - Tar bort ALLA andra konton — systemet ska ha exakt en användare.
 */
import bcrypt from "bcryptjs";
import { ne, eq } from "drizzle-orm";
import { db, pool, usersTable } from "@workspace/db";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "robbanbro@icloud.com").toLowerCase().trim();
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME ?? "Robban";

async function main(): Promise<void> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, ADMIN_EMAIL))
    .limit(1);

  if (!existing) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      throw new Error(
        "ADMIN_PASSWORD (minst 8 tecken) krävs för att skapa kontot första gången.",
      );
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(usersTable).values({
      username: ADMIN_EMAIL,
      passwordHash,
      displayName: ADMIN_DISPLAY_NAME,
    });
    console.log(`✔ Konto skapat: ${ADMIN_EMAIL}`);
  } else {
    await db
      .update(usersTable)
      .set({ displayName: ADMIN_DISPLAY_NAME })
      .where(eq(usersTable.id, existing.id));
    console.log(`✔ Konto finns redan: ${ADMIN_EMAIL} (lösenordet lämnas orört)`);
  }

  // Enforce single-account: ta bort alla andra användare.
  const removed = await db
    .delete(usersTable)
    .where(ne(usersTable.username, ADMIN_EMAIL))
    .returning({ username: usersTable.username });
  for (const r of removed) {
    console.log(`✖ Tog bort övrigt konto: ${r.username}`);
  }

  console.log("Klart.");
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
    return pool.end();
  });
