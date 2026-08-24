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

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Fel användarnamn eller lösenord" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username } satisfies object,
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    gmailAddress: user.gmailAddress,
    colleagueEmail: user.colleagueEmail,
    chatName: user.chatName ?? user.displayName,
  });
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

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    gmailAddress: user.gmailAddress,
    colleagueEmail: user.colleagueEmail,
    chatName: user.chatName ?? user.displayName,
  });
});

// PATCH /api/auth/me — update own profile
router.patch("/auth/me", requireAuth, async (req, res) => {
  const { displayName, chatName, colleagueEmail, gmailAddress, password, newPassword } = req.body as {
    displayName?: string;
    chatName?: string;
    colleagueEmail?: string;
    gmailAddress?: string;
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
  if (chatName !== undefined) updates.chatName = chatName.trim() || null;
  if (colleagueEmail !== undefined) updates.colleagueEmail = colleagueEmail.trim() || null;
  if (gmailAddress !== undefined) updates.gmailAddress = gmailAddress.trim() || null;

  // Password change
  if (newPassword) {
    if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Nuvarande lösenord är fel" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updates).length === 0) {
    res.json({ ok: true });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    gmailAddress: updated.gmailAddress,
    colleagueEmail: updated.colleagueEmail,
    chatName: updated.chatName ?? updated.displayName,
  });
});

export default router;
