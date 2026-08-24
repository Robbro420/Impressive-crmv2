import http from "http";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { messagesTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

// ── Startup validation — fail closed on missing secrets ────────────────────
const JWT_SECRET = process.env["SESSION_SECRET"];
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET must be set. Server will not start without it.");
}

const SENDER_MAX_LEN = 80;
const CONTENT_MAX_LEN = 2000;

// Trusted origins: the Replit-assigned domain(s).
// Returns true (allow all) only when REPLIT_DOMAINS is absent (local dev).
function getAllowedOrigins(): string[] | boolean {
  const domains = process.env["REPLIT_DOMAINS"];
  if (!domains) return true;
  return domains.split(",").map((d) => `https://${d.trim()}`);
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({ origin: getAllowedOrigins(), credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/api", router);

// Create HTTP server and attach Socket.io
export const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  path: "/api/socket.io",
  cors: {
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ── Auth middleware — verify JWT sent in socket handshake ──────────────────
// The token is issued by GET /api/chat/token (requires session cookie).
// A valid userId is REQUIRED — tokens without one (e.g. legacy passphrase
// tokens) are rejected so every connected socket maps to a known user.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== "string") {
    return next(new Error("Unauthorized"));
  }
  let payload: Record<string, unknown>;
  try {
    payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return next(new Error("Unauthorized"));
  }
  // Reject tokens without a userId (e.g. old passphrase-only tokens)
  if (typeof payload.userId !== "number") {
    return next(new Error("Unauthorized: user-bound token required"));
  }
  const userId = payload.userId as number;
  // Verify the user still exists in the approved accounts table.
  // This immediately revokes access for deleted/legacy accounts.
  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) {
      return next(new Error("Unauthorized: account not found"));
    }
  } catch {
    return next(new Error("Unauthorized: DB error"));
  }
  socket.data.userId = userId;
  return next();
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id, userId: socket.data.userId }, "Chat client connected");

  // Send recent message history (last 100) on connect
  db.select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.createdAt))
    .limit(100)
    .then((rows) => {
      socket.emit("history", rows.reverse());
    })
    .catch((err) => {
      logger.error({ err }, "Failed to load chat history");
    });

  socket.on("message", async (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const { content } = data as Record<string, unknown>;

    const contentStr = typeof content === "string" ? content.trim().slice(0, CONTENT_MAX_LEN) : "";
    if (!contentStr) return;

    // Resolve sender server-side from the authenticated user's profile.
    // Never trust the client-supplied sender field — prevents impersonation.
    let senderStr = "Okänd";
    if (socket.data.userId) {
      try {
        const [user] = await db
          .select({ chatName: usersTable.chatName, displayName: usersTable.displayName })
          .from(usersTable)
          .where(eq(usersTable.id, socket.data.userId))
          .limit(1);
        if (user) {
          senderStr = (user.chatName ?? user.displayName).trim().slice(0, SENDER_MAX_LEN);
        }
      } catch (err) {
        logger.error({ err }, "Failed to resolve sender from DB");
      }
    }

    try {
      const [saved] = await db
        .insert(messagesTable)
        .values({ sender: senderStr, content: contentStr })
        .returning();
      io.emit("message", saved);
    } catch (err) {
      logger.error({ err }, "Failed to save chat message");
    }
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Chat client disconnected");
  });
});

export default app;
