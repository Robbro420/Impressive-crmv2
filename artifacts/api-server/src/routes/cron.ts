/**
 * cron.ts — endpoints som körs av Vercel Cron (se vercel.json).
 *
 * Vercel skickar automatiskt `Authorization: Bearer ${CRON_SECRET}` när
 * miljövariabeln CRON_SECRET är satt på projektet. Endpointen avvisar allt
 * annat, så den kan inte triggas av utomstående.
 */
import { Router, type IRouter } from "express";
import { transitionExpiredCampaigns } from "../scheduler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/cron/campaigns", async (req, res): Promise<void> => {
  const secret = process.env["CRON_SECRET"];
  if (!secret) {
    res.status(503).json({ error: "CRON_SECRET är inte konfigurerad." });
    return;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const transitioned = await transitionExpiredCampaigns(logger);
  res.json({ ok: true, transitioned });
});

export default router;
