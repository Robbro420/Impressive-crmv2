import express, { type Express } from "express";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

// ── Startup validation — fail closed on missing secrets ────────────────────
if (!process.env["SESSION_SECRET"]) {
  throw new Error("SESSION_SECRET must be set. Server will not start without it.");
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
app.use(cookieParser());
// 25mb: Postmark delivers PDF attachments Base64-encoded in the JSON body
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/api", router);

export default app;
