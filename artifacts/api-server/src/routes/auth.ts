import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/require-auth";

const router = Router();
const JWT_SECRET = process.env["SESSION_SECRET"]!;
const COOKIE_NAME = "crm_auth";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Brute force-skydd: efter MAX_FAILED_ATTEMPTS misslyckade försök låses
// kontot i LOCKOUT_MINUTES. Räknaren nollställs vid lyckad inloggning.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Dummy-hash så att okända användarnamn tar lika lång tid som fel lösenord
// (annars går det att lista giltiga konton via svarstiden).
const DUMMY_HASH = bcrypt.hashSync("dummy-timing-equalizer", 12);

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    colleagueEmail: user.colleagueEmail,
  };
}

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Användarnamn och lösenord krävs" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH); // timing equalizer
    res.status(401).json({ error: "Fel användarnamn eller lösenord" });
    return;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    res.status(429).json({
      error: `Kontot är låst efter för många misslyckade försök. Försök igen om ${minutesLeft} min.`,
    });
    return;
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const failed = user.failedLoginAttempts + 1;
    await db
      .update(usersTable)
      .set({
        failedLoginAttempts: failed,
        lockedUntil:
          failed >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null,
      })
      .where(eq(usersTable.id, user.id));
    res.status(401).json({ error: "Fel användarnamn eller lösenord" });
    return;
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await db
      .update(usersTable)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(usersTable.id, user.id));
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username } satisfies object,
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json(publicUser(user));
});

// POST /api/auth/logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Användare hittades inte" });
    return;
  }

  res.json(publicUser(user));
});

// PATCH /api/auth/me — update own profile
router.patch("/auth/me", requireAuth, async (req, res) => {
  const { displayName, colleagueEmail, password, newPassword } = req.body as {
    displayName?: string;
    colleagueEmail?: string;
    password?: string;
    newPassword?: string;
  };

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Användare hittades inte" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (displayName?.trim()) updates.displayName = displayName.trim();
  if (colleagueEmail !== undefined) updates.colleagueEmail = colleagueEmail.trim() || null;

  // Password change
  if (newPassword) {
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Nytt lösenord måste vara minst 8 tecken" });
      return;
    }
    if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Nuvarande lösenord är fel" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updates).length === 0) {
    res.json(publicUser(user));
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json(publicUser(updated));
});

export default router;
