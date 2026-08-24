# Impressive CRM

Internt CRM för Impressive Media — kunder, ordrar, kampanjer, Mersälj och automatiskt
skapande av kundkort + ordrar från PDF-orderbekräftelser som BCC:as till Postmark.

## Arkitektur

```text
Webbläsare
   │
   ▼
React + Vite (artifacts/robbanbro-crm)          → statisk build på Vercel
   │  /api
   ▼
Express 5 (artifacts/api-server)                → Vercel serverless function (api/index.ts)
   │
   ├── Neon PostgreSQL via Drizzle ORM (lib/db)
   ├── Postmark inbound webhook (token-skyddad)
   ├── Gemini AI — tolkar orderbekräftelser (AI-först, regex-fallback)
   ├── Resend — utgående Mersälj-mejl
   └── Vercel Cron — daglig kampanj-transition (api/cron/campaigns)
```

Monorepo (pnpm workspaces):

| Paket | Innehåll |
|---|---|
| `artifacts/robbanbro-crm` | Webbappen (React 19, Vite, Tailwind 4, shadcn/ui) |
| `artifacts/api-server` | Express-API:t |
| `api/index.ts` | Vercel-funktionens entry point (importerar Express-appen) |
| `lib/db` | Drizzle-schema + Neon-anslutning |
| `lib/api-spec` | OpenAPI-kontrakt (källa för kodgenerering) |
| `lib/api-zod` | Genererade Zod-scheman |
| `lib/api-client-react` | Genererade React Query-hooks |
| `lib/integrations-gemini-ai` | Gemini-klient |
| `scripts` | Seed-skript (admin-konto) |

## Miljövariabler

| Variabel | Krävs | Funktion |
|---|---|---|
| `DATABASE_URL` | Ja | Neon Postgres-anslutningssträng |
| `SESSION_SECRET` | Ja | Signerar inloggnings-JWT (långt slumpvärde) |
| `POSTMARK_WEBHOOK_TOKEN` | Ja (för webhook) | Hemlig token i webhook-URL:en — webhooken avvisar anrop utan den |
| `CRON_SECRET` | Ja (för cron) | Vercel skickar den som Bearer-token till cron-endpointen |
| `GEMINI_API_KEY` | För AI | Google AI Studio-nyckel — AI-import + AI-tolkning i webhooken |
| `RESEND_API_KEY` | För utskick | Resend API-nyckel för Mersälj-mejl |
| `RESEND_FROM` | Rekommenderad | Avsändare, t.ex. `Impressive CRM <noreply@impressivemedia.se>` (domänen måste vara verifierad i Resend) |
| `ADMIN_EMAIL` | Vid seed | Det enda kontots inloggningsadress (default `robbanbro@icloud.com`) |
| `ADMIN_PASSWORD` | Vid första seed | Initialt lösenord (byts sedan under Inställningar) |

## Driftsättning (Vercel + Neon)

1. **Databas** — skapa ett projekt på [neon.tech](https://neon.tech), kopiera anslutningssträngen.
2. **Pusha schema + skapa kontot** (lokalt, engångs):
   ```bash
   pnpm install
   DATABASE_URL="postgres://..." pnpm db:push
   DATABASE_URL="postgres://..." ADMIN_PASSWORD="..." pnpm seed
   ```
3. **Vercel** — importera GitHub-repot på vercel.com. `vercel.json` styr build,
   output, rewrites och cron. Lägg in alla miljövariabler ovan under
   *Settings → Environment Variables*.
4. **Postmark** — sätt inbound webhook till
   `https://DIN-DOMÄN/api/emails/webhook?token=VÄRDET-AV-POSTMARK_WEBHOOK_TOKEN`
   och bocka i *Include raw email content in JSON payload* så att bilagor följer med.
5. **Resend** — verifiera din avsändardomän och sätt `RESEND_FROM`.
6. **Gemini** — hämta en API-nyckel på [aistudio.google.com](https://aistudio.google.com).

### Migrera data från Replit

Kör mot den gamla Replit-databasen och den nya Neon-databasen:

```bash
pg_dump "GAMLA_DATABASE_URL" --data-only \
  -t customers -t orders -t emails -t timeline_events -t todos -t cases -t goals \
  > data.sql
psql "NYA_DATABASE_URL" < data.sql
```

(`users`, `messages` och `calendar_logs` tas inte med — kontot skapas av seed-skriptet,
chatten är borttagen, och kalenderanteckningar är knutna till gamla användar-id:n.)

## Lokal utveckling

```bash
pnpm install
# .env i artifacts/api-server behövs inte — sätt variablerna i skalet eller använd dotenv
DATABASE_URL=... SESSION_SECRET=dev-secret pnpm dev        # API på :5000
pnpm dev:web                                               # Vite på :5173, proxar /api → :5000
```

- `pnpm typecheck` — hela repot
- `pnpm build` — typecheck + frontend-build
- `pnpm --filter @workspace/api-spec run codegen` — regenerera API-klient + Zod från `openapi.yaml`
- `pnpm db:push` — pusha schemaändringar till databasen

## Säkerhetsmodell

- **Ett enda konto.** Seed-skriptet skapar exakt en användare och raderar alla andra.
  Ingen registrering finns.
- Lösenord: bcrypt cost 12. Inloggning: JWT i httpOnly-cookie (7 dagar, `Secure` i produktion).
- Brute force-skydd: kontot låses 15 min efter 5 misslyckade inloggningsförsök.
- Postmark-webhooken kräver hemlig token; utan `POSTMARK_WEBHOOK_TOKEN` i miljön svarar den 503.
- Cron-endpointen kräver `Authorization: Bearer $CRON_SECRET` (skickas automatiskt av Vercel).
- Databasen har foreign keys med städregler (radera kund ⇒ ordrar/tidslinje följer med,
  mejl/ärenden/todos kopplas loss).
