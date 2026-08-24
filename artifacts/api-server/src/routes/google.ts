import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, emailsTable, customersTable, timelineTable } from "@workspace/db";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();

// Never cache the client — tokens expire. Create fresh per request.
function connectors() {
  return new ReplitConnectors();
}

// ─── Gmail helpers ────────────────────────────────────────────────────────────

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/** Recursively find the first text/plain (fallback text/html) body in the payload tree. */
function extractBody(part: GmailPart | undefined): { text: string | null; html: string | null } {
  let text: string | null = null;
  let html: string | null = null;

  const walk = (p: GmailPart | undefined): void => {
    if (!p) return;
    if (p.body?.data) {
      const decoded = decodeBase64Url(p.body.data);
      if (p.mimeType === "text/plain" && !text) text = decoded;
      else if (p.mimeType === "text/html" && !html) html = decoded;
      else if (!p.mimeType && !text) text = decoded;
    }
    for (const child of p.parts ?? []) walk(child);
  };
  walk(part);
  return { text, html };
}

function header(msg: GmailMessage, name: string): string | null {
  const h = msg.payload?.headers?.find(
    (x) => x.name.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? null;
}

/** Parse "Name <addr@x.se>" → { name, email } */
function parseFromHeader(raw: string | null): { name: string | null; email: string } {
  if (!raw) return { name: null, email: "okänd@okänd" };
  const match = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || null, email: match[2].trim().toLowerCase() };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /google/gmail/status — is the Gmail connector live?
 * Verifies by calling the Gmail profile endpoint through the Replit connector proxy.
 */
router.get("/google/gmail/status", async (_req, res): Promise<void> => {
  try {
    const response = await connectors().proxy(
      "google-mail",
      "/gmail/v1/users/me/profile",
      { method: "GET" },
    );
    if (!response.ok) {
      res.json({ connected: false, emailAddress: null });
      return;
    }
    const profile = (await response.json()) as { emailAddress?: string };
    res.json({ connected: true, emailAddress: profile.emailAddress ?? null });
  } catch (err) {
    console.error("[gmail] status check failed:", err);
    res.json({ connected: false, emailAddress: null });
  }
});

/**
 * POST /google/gmail/sync — fetch recent inbox messages and import new ones
 * into the emails inbox. Auto-links to customers by sender address.
 */
router.post("/google/gmail/sync", async (_req, res): Promise<void> => {
  const c = connectors();

  // 1. List recent inbox messages
  const listResp = await c.proxy(
    "google-mail",
    "/gmail/v1/users/me/messages?" +
      new URLSearchParams({
        q: "in:inbox newer_than:30d",
        maxResults: "25",
      }).toString(),
    { method: "GET" },
  );

  if (!listResp.ok) {
    const errText = await listResp.text();
    console.error("[gmail] list failed:", listResp.status, errText);
    res.status(502).json({
      error:
        listResp.status === 401
          ? "Gmail-kopplingen behöver godkännas på nytt."
          : `Gmail-fel (${listResp.status}). Försök igen.`,
    });
    return;
  }

  const listData = (await listResp.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const ids = (listData.messages ?? []).map((m) => m.id);

  if (ids.length === 0) {
    res.json({ fetched: 0, imported: 0, linked: 0 });
    return;
  }

  // 2. Skip messages already imported (dedupe on gmail_id)
  const existing = await db
    .select({ gmailId: emailsTable.gmailId })
    .from(emailsTable)
    .where(inArray(emailsTable.gmailId, ids));
  const existingIds = new Set(existing.map((e) => e.gmailId));
  const newIds = ids.filter((id) => !existingIds.has(id));

  let imported = 0;
  let linked = 0;

  for (const id of newIds) {
    const msgResp = await c.proxy(
      "google-mail",
      `/gmail/v1/users/me/messages/${id}?format=full`,
      { method: "GET" },
    );
    if (!msgResp.ok) {
      console.error(`[gmail] fetch message ${id} failed:`, msgResp.status);
      continue;
    }
    const msg = (await msgResp.json()) as GmailMessage;

    const from = parseFromHeader(header(msg, "From"));
    const subject = header(msg, "Subject") ?? "(utan ämne)";
    const dateHeader = header(msg, "Date");
    const receivedAt = msg.internalDate
      ? new Date(parseInt(msg.internalDate, 10))
      : dateHeader
        ? new Date(dateHeader)
        : new Date();
    const { text, html } = extractBody(msg.payload);

    // Auto-link customer by sender email
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.email, from.email));

    const [emailRecord] = await db
      .insert(emailsTable)
      .values({
        gmailId: msg.id,
        fromEmail: from.email,
        fromName: from.name,
        subject,
        bodyText: text ?? msg.snippet ?? null,
        bodyHtml: html,
        customerId: customer?.id ?? null,
        processed: !!customer,
        receivedAt,
      })
      .onConflictDoNothing()
      .returning();

    if (!emailRecord) continue; // already imported (race)
    imported++;

    if (customer) {
      linked++;
      await db.insert(timelineTable).values({
        customerId: customer.id,
        type: "email_received",
        description: `E-mail hämtad från Gmail: ${subject}`,
        referenceId: emailRecord.id,
        occurredAt: receivedAt,
      });
    }
  }

  res.json({ fetched: ids.length, imported, linked });
});

export default router;
