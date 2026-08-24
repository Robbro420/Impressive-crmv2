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
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const ParseBody = z.object({
  text: z.string().min(20, "Klistra in mer text från orderbekräftelsen"),
});

// Strikt validering av AI-svaret innan det når frontend.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum måste vara YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Ogiltigt datum")
  .nullable()
  .catch(null);
const shortStr = z.string().trim().max(300).nullable().catch(null);

const ParsedExtraction = z.object({
  kund: z.object({
    namn: shortStr,
    orgnr: shortStr,
    kundnummer: shortStr,
    kontaktperson: shortStr,
    epost: shortStr,
    telefon: shortStr,
    adress: shortStr,
    postnummer: shortStr,
    ort: shortStr,
  }),
  order: z.object({
    ordernummer: shortStr,
    amne: shortStr,
    belopp_exkl_moms: z.number().finite().nonnegative().nullable().catch(null),
    orderdatum: isoDate,
    kampanjstart: isoDate,
    kampanjslut: isoDate,
    kampanjlangd_dagar: z.number().int().positive().max(3650).nullable().catch(null),
    beskrivning: z.string().trim().max(5000).nullable().catch(null),
    betalvillkor: shortStr,
  }),
});

const EXTRACTION_PROMPT = `Du är en dataextraherare för ett svenskt CRM (mediabyrå som säljer digital annonsering).
Ur texten nedan (en orderbekräftelse — mailtext och/eller PDF-text) ska du extrahera fälten.

Svara med ENDAST giltig JSON (ingen markdown, inga kommentarer) med exakt detta format:
{
  "kund": {
    "namn": "företagsnamn eller kundnamn",
    "orgnr": "organisationsnummer eller null",
    "kundnummer": "kundnr från dokumentet eller null",
    "kontaktperson": "namn eller null",
    "epost": "kontaktmail eller null",
    "telefon": "telefonnummer eller null",
    "adress": "gatuadress eller null",
    "postnummer": "postnummer eller null",
    "ort": "ort eller null"
  },
  "order": {
    "ordernummer": "ordernummer eller null",
    "amne": "kort beskrivning av vad ordern gäller",
    "belopp_exkl_moms": 12345.0,
    "orderdatum": "YYYY-MM-DD eller null",
    "kampanjstart": "YYYY-MM-DD eller null (när kampanjen startar; annars orderdatum)",
    "kampanjslut": "YYYY-MM-DD eller null (start + kampanjlängd om längd anges, t.ex. '30 dagar', '2 månader')",
    "kampanjlangd_dagar": 30,
    "beskrivning": "orderrader/vad som ingår",
    "betalvillkor": "t.ex. '10 dagar netto' eller null"
  }
}

Regler:
- Belopp: använd belopp EXKL. moms. Om bara inkl. moms anges, dela med 1.25.
- Om kampanjlängd nämns (t.ex. "30 dagar", "2 månader"): kampanjslut = kampanjstart + längden. 1 månad = 30 dagar.
- Om ingen kampanjlängd hittas: kampanjlangd_dagar = 30 och kampanjslut = start + 30 dagar.
- Fält du inte hittar sätts till null.`;

router.post("/import/parse-email", async (req, res): Promise<void> => {
  const parsed = ParseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Ogiltig text" });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${EXTRACTION_PROMPT}\n\n--- TEXT ATT TOLKA ---\n${parsed.data.text.slice(0, 30000)}`,
      config: { responseMimeType: "application/json" },
    });

    const raw = response.text ?? "";
    const validated = ParsedExtraction.safeParse(JSON.parse(raw));
    if (!validated.success) {
      res.status(502).json({ error: "AI-svaret hade fel format. Försök igen eller fyll i manuellt." });
      return;
    }
    res.json(validated.data);
  } catch (err) {
    req.log?.error?.({ err }, "AI-tolkning misslyckades");
    res.status(502).json({ error: "AI-tolkningen misslyckades. Försök igen eller fyll i manuellt." });
  }
});

export default router;
