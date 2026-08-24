/**
 * Local development entry point. In production the app runs as a Vercel
 * serverless function (see /api/index.ts at the repo root) — this file is
 * only used for `pnpm dev`.
 */
import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"] ?? 5000);

app.listen(port, () => {
  logger.info({ port }, "API server listening (local dev)");
});
