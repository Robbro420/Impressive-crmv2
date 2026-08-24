/**
 * extract-order.ts — Gemini-driven extraktion av kund- + orderdata ur
 * orderbekräftelsetext (mail och/eller PDF-text).
 *
 * Delas av:
 *   - POST /import/parse-email (manuell AI-import med granskning i UI:t)
 *   - POST /emails/webhook     (automatiskt Postmark-flöde, med regex-fallback)
 */
import { z } from "zod";
import { getAi, hasGemini } from "@workspace/integrations-gemini-ai";

// Strikt validering av AI-svaret innan det används.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum måste vara YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Ogiltigt datum")
  .nullable()
  .catch(null);
const shortStr = z.string().trim().max(300).nullable().catch(null);

export const ParsedExtraction = z.object({
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

export type OrderExtraction = z.infer<typeof ParsedExtraction>;

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

export { hasGemini };

/**
 * Kör Gemini-extraktion på råtext. Kastar vid saknad nyckel, modellfel
 * eller ogiltigt svar — anroparen väljer fallback-strategi.
 */
export async function extractOrderWithAI(text: string): Promise<OrderExtraction> {
  const response = await getAi().models.generateContent({
    model: "gemini-3.6-flash",
    contents: `${EXTRACTION_PROMPT}\n\n--- TEXT ATT TOLKA ---\n${text.slice(0, 30000)}`,
    config: { responseMimeType: "application/json" },
  });

  const raw = response.text ?? "";
  const validated = ParsedExtraction.safeParse(JSON.parse(raw));
  if (!validated.success) {
    throw new Error(`AI-svaret hade fel format: ${validated.error.message}`);
  }
  return validated.data;
}
