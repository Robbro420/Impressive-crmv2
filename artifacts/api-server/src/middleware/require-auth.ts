import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env["SESSION_SECRET"]!;

export interface AuthPayload {
  userId: number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Paths that never require authentication (Postmark webhook, health)
const PUBLIC_PATHS = ["/api/emails/webhook"];

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (PUBLIC_PATHS.some((p) => req.path === p || req.originalUrl.startsWith(p))) {
    next();
    return;
  }
  const token = req.cookies?.crm_auth;
  if (!token) {
    res.status(401).json({ error: "Inte inloggad" });
    return;
  }
  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Ogiltig session — logga in igen" });
    return;
  }
  // Verify the userId still exists in the approved accounts table.
  // This immediately invalidates tokens for deleted/legacy accounts even
  // before the JWT's natural 7-day expiry.
  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);
    if (!user) {
      res.status(401).json({ error: "Kontot finns inte längre — logga in igen" });
      return;
    }
  } catch {
    res.status(503).json({ error: "Databasfel vid autentisering" });
    return;
  }
  req.user = payload;
  next();
}
