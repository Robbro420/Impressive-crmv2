/**
 * import.ts — AI-driven import av orderbekräftelser.
 *
 * POST /import/parse-email
 *   Body: { text: string }
 *   Klistra in råtexten från en orderbekräftelse (mail och/eller PDF-text).
 *   Gemini extraherar strukturerad kund- + orderdata som frontend
 *   sedan låter användaren granska innan kund/order skapas.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { extractOrderWithAI, hasGemini } from "../lib/extract-order";

const router: IRouter = Router();

const ParseBody = z.object({
  text: z.string().min(20, "Klistra in mer text från orderbekräftelsen"),
});

router.post("/import/parse-email", async (req, res): Promise<void> => {
  const parsed = ParseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ogiltig text" });
    return;
  }

  if (!hasGemini()) {
    res.status(503).json({ error: "AI-import är inte konfigurerad (GEMINI_API_KEY saknas)." });
    return;
  }

  try {
    const extraction = await extractOrderWithAI(parsed.data.text);
    res.json(extraction);
  } catch (err) {
    req.log?.error?.({ err }, "AI-tolkning misslyckades");
    res.status(502).json({ error: "AI-tolkningen misslyckades. Försök igen eller fyll i manuellt." });
  }
});

export default router;
