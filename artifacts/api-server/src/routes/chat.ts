import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

/**
 * POST /api/chat/auth — RETIRED
 *
 * The legacy passphrase-based chat token endpoint has been removed.
 * All socket connections must now use GET /api/chat/token which requires
 * a valid session cookie and returns a user-bound JWT (with userId).
 * This endpoint always returns 410 Gone so existing passphrase holders
 * cannot obtain a usable socket token.
 */
router.post("/chat/auth", (_req, res): void => {
  res.status(410).json({ error: "Dit endpoint är borttaget. Logga in via /login." });
});

/**
 * GET /api/chat/token
 * Returns a socket JWT for already-authenticated (cookie) users.
 * Replaces the passphrase flow for logged-in users.
 */
router.get("/chat/token", requireAuth, (req, res): void => {
  const jwtSecret = process.env["SESSION_SECRET"];
  if (!jwtSecret) {
    res.status(503).json({ error: "Server inte konfigurerad." });
    return;
  }
  const token = jwt.sign({ chat: true, userId: req.user!.userId }, jwtSecret, { expiresIn: "7d" });
  res.json({ token });
});

export default router;
