import { createRequire } from "node:module";
import { Router, type IRouter } from "express";
import { eq, or, ilike } from "drizzle-orm";
import { db, emailsTable, customersTable, ordersTable, timelineTable } from "@workspace/db";
import {
  GetEmailParams,
  LinkEmailToCustomerParams,
  LinkEmailToCustomerBody,
  ReceiveEmailWebhookBody,
} from "@workspace/api-zod";

const _require = createRequire(import.meta.url);
const router: IRouter = Router();

// ─── PDF helpers ─────────────────────────────────────────────────────────────

interface ParsedOrder {
  orderNumber: string | null;
  customerNumber: string | null;
  customerName: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  orderDate: string | null;
  amount: number | null;
  productDescription: string | null;
  customerRef: string | null;
  ourRef: string | null;
}

async function extractPDFText(base64Content: string): Promise<string> {
  try {
    const pdfParse = _require("pdf-parse");
    const buffer = Buffer.from(base64Content, "base64");
    const result = await pdfParse(buffer);
    return result.text as string;
  } catch (err) {
    console.error("[webhook] PDF parse error:", err);
    return "";
  }
}

function parseOrderConfirmation(rawText: string): ParsedOrder {
  // pdf-parse (v1) concatenates each PDF text element without separators,
  // so fields appear as "Kundnr1118", "Ordernummer1132", "Orderdatum2026-08-11"
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const text = lines.join("\n");

  // Key and value are concatenated directly (no space)
  const orderNumber    = text.match(/Ordernummer(\d+)/)?.[1] ?? null;
  const customerNumber = text.match(/Kundnr(\d+)/)?.[1] ?? null;
  const orderDate      = text.match(/Orderdatum(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  const customerRef    = text.match(/Er referens(.+)/m)?.[1]?.trim() ?? null;
  const ourRef         = text.match(/Vår referens(.+)/m)?.[1]?.trim() ?? null;

  // Customer name sits immediately after the "Ordernummer{N}" line
  let customerName: string | null = null;
  let address: string | null = null;
  let city: string | null = null;
  let postalCode: string | null = null;

  const orderNumIdx = lines.findIndex((l) => /^Ordernummer\d+$/.test(l));
  if (orderNumIdx >= 0) {
    const nameLine = lines[orderNumIdx + 1] ?? "";
    // Customer name: not a digit-starting line and not a table header
    if (nameLine && !/^\d/.test(nameLine) && !/^Art\./.test(nameLine)) {
      customerName = nameLine;
    }
    const addrLine = lines[orderNumIdx + 2] ?? "";
    if (addrLine && addrLine.length < 80 && !/^\d{3}/.test(addrLine)) {
      address = addrLine;
    }
    const postalLine = lines[orderNumIdx + 3] ?? "";
    const postalMatch = postalLine.match(/^(\d{3}\s?\d{2})\s+(.+)/);
    if (postalMatch) {
      postalCode = postalMatch[1].replace(/\s/, "");
      city = postalMatch[2].trim();
    }
  }

  // Amount excl. VAT: "Exkl. moms14 360,00" → strip prefix, parse number
  let amount: number | null = null;
  const exklLine = lines.find((l) => /^Exkl\.\s*moms/.test(l));
  if (exklLine) {
    const amtStr = exklLine
      .replace(/^Exkl\.\s*moms/, "")
      .replace(/\s/g, "")
      .replace(",", ".");
    const parsed = parseFloat(amtStr);
    if (!isNaN(parsed)) amount = parsed;
  }

  // Product line: "1Display annonsering - Stor paket1,00st14 360,0014 360,00"
  // Starts with art.nr digit(s) followed immediately by an uppercase letter
  let productDescription: string | null = null;
  const productLine = lines.find(
    (l) => /^\d+[A-ZÅÄÖ]/.test(l) && /\d+,\d{2}/.test(l)
  );
  if (productLine) {
    // Capture everything between leading digits and the first quantity (N,NN)
    const match = productLine.match(/^\d+(.+?)(?=\d+,\d{2})/);
    if (match) productDescription = match[1].trim();
  }

  return {
    orderNumber,
    customerNumber,
    customerName,
    address,
    city,
    postalCode,
    orderDate,
    amount,
    productDescription,
    customerRef,
    ourRef,
  };
}

/**
 * Parse campaign length from PDF/product text ("30 Dagar", "2 mån", "1 månad").
 * Returns number of days (default 30 when nothing is found).
 */
function parseCampaignDays(text: string): number {
  const dayMatch = text.match(/(\d+)\s*dag/i);
  if (dayMatch) return parseInt(dayMatch[1], 10);
  const monthMatch = text.match(/(\d+)\s*mån/i);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;
  if (/månad/i.test(text)) return 30;
  return 30;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function matchOrCreateCustomer(
  parsed: ParsedOrder
): Promise<(typeof customersTable.$inferSelect) | null> {
  if (!parsed.customerName) return null;

  // 1. Match by customerNumber (most reliable)
  if (parsed.customerNumber) {
    const [byNum] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.customerNumber, parsed.customerNumber));
    if (byNum) {
      console.log(`[webhook] Matched customer by number: ${byNum.name}`);
      return byNum;
    }
  }

  // 2. Match by name (case-insensitive)
  const [byName] = await db
    .select()
    .from(customersTable)
    .where(ilike(customersTable.name, parsed.customerName));
  if (byName) {
    console.log(`[webhook] Matched customer by name: ${byName.name}`);
    // Backfill customerNumber if now known
    if (parsed.customerNumber && !byName.customerNumber) {
      await db
        .update(customersTable)
        .set({ customerNumber: parsed.customerNumber })
        .where(eq(customersTable.id, byName.id));
    }
    return byName;
  }

  // 3. Create new customer from PDF data
  console.log(`[webhook] Creating new customer from PDF: ${parsed.customerName}`);
  const [newCustomer] = await db
    .insert(customersTable)
    .values({
      name: parsed.customerName,
      email: "",
      customerNumber: parsed.customerNumber ?? undefined,
      address: parsed.address ?? undefined,
      city: parsed.city ?? undefined,
      postalCode: parsed.postalCode ?? undefined,
      category: "foretag",
      status: "aktiv",
      notes: parsed.customerRef
        ? `Er referens: ${parsed.customerRef}`
        : undefined,
    })
    .returning();

  return newCustomer;
}

// ─── Route helpers ────────────────────────────────────────────────────────────

async function withCustomerName(email: typeof emailsTable.$inferSelect) {
  if (!email.customerId) return { ...email, customerName: null };
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, email.customerId));
  return { ...email, customerName: customer?.name ?? null };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get("/emails", async (req, res): Promise<void> => {
  const { customerId, processed } = req.query as Record<string, string>;

  let emails = await db.select().from(emailsTable).orderBy(emailsTable.receivedAt);

  if (customerId) {
    emails = emails.filter((e) => e.customerId === parseInt(customerId, 10));
  }
  if (processed !== undefined) {
    const processedBool = processed === "true";
    emails = emails.filter((e) => e.processed === processedBool);
  }

  const customerIds = [
    ...new Set(emails.filter((e) => e.customerId).map((e) => e.customerId!)),
  ];
  const customers = customerIds.length
    ? await db.select().from(customersTable)
    : [];
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const enriched = emails.reverse().map((e) => ({
    ...e,
    customerName: e.customerId ? (customerMap[e.customerId] ?? null) : null,
  }));

  res.json(enriched);
});

router.get("/emails/:id", async (req, res): Promise<void> => {
  const params = GetEmailParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [email] = await db
    .select()
    .from(emailsTable)
    .where(eq(emailsTable.id, params.data.id));
  if (!email) {
    res.status(404).json({ error: "Email not found" });
    return;
  }

  res.json(await withCustomerName(email));
});

router.post("/emails/:id/link-customer", async (req, res): Promise<void> => {
  const params = LinkEmailToCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = LinkEmailToCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [email] = await db
    .update(emailsTable)
    .set({ customerId: parsed.data.customerId, processed: true })
    .where(eq(emailsTable.id, params.data.id))
    .returning();

  if (!email) {
    res.status(404).json({ error: "Email not found" });
    return;
  }

  if (parsed.data.createOrder) {
    const [order] = await db
      .insert(ordersTable)
      .values({
        customerId: parsed.data.customerId,
        subject: email.subject,
        orderText: email.bodyText,
        status: "ny",
        emailId: email.id,
        orderDate: email.receivedAt,
      })
      .returning();

    await db.insert(timelineTable).values({
      customerId: parsed.data.customerId,
      type: "order_created",
      description: `Order skapad från e-mail: ${email.subject}`,
      referenceId: order.id,
      occurredAt: new Date(),
    });
  }

  await db.insert(timelineTable).values({
    customerId: parsed.data.customerId,
    type: "email_received",
    description: `E-mail kopplad: ${email.subject}`,
    referenceId: email.id,
    occurredAt: email.receivedAt,
  });

  res.json(await withCustomerName(email));
});

router.post("/emails/webhook", async (req, res): Promise<void> => {
  const parsed = ReceiveEmailWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fromEmail = parsed.data.From;
  const receivedAt = parsed.data.Date
    ? new Date(parsed.data.Date as string)
    : new Date();

  // ── 1. Check for PDF attachments (order confirmations) ────────────────────
  const attachments: Array<{
    Name: string;
    Content: string;
    ContentType: string;
  }> = (req.body.Attachments as any[]) ?? [];

  const pdfAttachments = attachments.filter(
    (a) =>
      a.ContentType === "application/pdf" ||
      (a.Name ?? "").toLowerCase().endsWith(".pdf")
  );

  if (pdfAttachments.length > 0) {
    // Process each PDF — use the first one that yields order data
    for (const pdf of pdfAttachments) {
      const pdfText = await extractPDFText(pdf.Content);
      if (!pdfText) continue;

      const orderData = parseOrderConfirmation(pdfText);
      console.log("[webhook] Parsed PDF order data:", orderData);

      if (!orderData.customerName && !orderData.orderNumber) continue;

      // ── 2. Match or create customer ──────────────────────────────────────
      let customer = await matchOrCreateCustomer(orderData);

      // If PDF gave us nothing useful, fall back to email-based matching
      if (!customer) {
        const [emailMatch] = await db
          .select()
          .from(customersTable)
          .where(eq(customersTable.email, fromEmail));
        customer = emailMatch ?? null;
      }

      // ── 3. Store the email record ────────────────────────────────────────
      const subject =
        parsed.data.Subject ||
        (orderData.orderNumber
          ? `Orderbekräftelse #${orderData.orderNumber}`
          : "Orderbekräftelse");

      const emailBodyText =
        parsed.data.TextBody ||
        `Ordernummer: ${orderData.orderNumber ?? "-"}\n` +
          `Kund: ${orderData.customerName ?? "-"}\n` +
          `Produkt: ${orderData.productDescription ?? "-"}\n` +
          `Belopp (exkl. moms): ${orderData.amount?.toLocaleString("sv-SE") ?? "-"} kr\n` +
          `Er referens: ${orderData.customerRef ?? "-"}\n` +
          `Vår referens: ${orderData.ourRef ?? "-"}`;

      const [emailRecord] = await db
        .insert(emailsTable)
        .values({
          fromEmail,
          fromName: parsed.data.FromName as string | undefined,
          subject,
          bodyText: emailBodyText,
          bodyHtml: parsed.data.HtmlBody as string | undefined,
          customerId: customer?.id ?? null,
          processed: !!customer,
          receivedAt,
        })
        .returning();

      // ── 4. Auto-create order from PDF data ───────────────────────────────
      if (customer) {
        const orderDate = orderData.orderDate
          ? new Date(orderData.orderDate)
          : receivedAt;

        const orderDescription = [
          orderData.productDescription,
          orderData.customerRef
            ? `Er referens: ${orderData.customerRef}`
            : null,
          orderData.ourRef ? `Vår referens: ${orderData.ourRef}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        // Kampanjdatum: start = orderdatum, slut = start + kampanjlängd ur texten
        const campaignStart =
          orderData.orderDate ?? receivedAt.toISOString().slice(0, 10);
        const campaignDays = parseCampaignDays(
          `${orderData.productDescription ?? ""}\n${pdfText}`,
        );
        const campaignEnd = addDays(campaignStart, campaignDays);

        const [order] = await db
          .insert(ordersTable)
          .values({
            customerId: customer.id,
            subject: orderData.productDescription ?? subject,
            orderText: pdfText,           // full PDF text — visible & copyable in customer card
            orderNumber: orderData.orderNumber ?? undefined,
            status: "produktion",
            amount: orderData.amount?.toString() as any,
            emailId: emailRecord.id,
            orderDate,
            campaignStart,
            campaignEnd,
            notes: orderDescription || undefined,
          })
          .returning();

        await db.insert(timelineTable).values([
          {
            customerId: customer.id,
            type: "order_created",
            description: `Order #${orderData.orderNumber ?? order.id} skapad automatiskt från PDF`,
            referenceId: order.id,
            occurredAt: new Date(),
          },
          {
            customerId: customer.id,
            type: "email_received",
            description: `Orderbekräftelse mottagen: ${subject}`,
            referenceId: emailRecord.id,
            occurredAt: receivedAt,
          },
        ]);
      }

      res.json({ ok: true, auto: true, customer: customer?.name ?? null });
      return;
    }
  }

  // ── Fallback: no PDF — standard email matching by From address ────────────
  const [existingCustomer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.email, fromEmail));

  const [emailRecord] = await db
    .insert(emailsTable)
    .values({
      fromEmail,
      fromName: parsed.data.FromName as string | undefined,
      subject: parsed.data.Subject,
      bodyText: parsed.data.TextBody as string | undefined,
      bodyHtml: parsed.data.HtmlBody as string | undefined,
      customerId: existingCustomer?.id ?? null,
      processed: !!existingCustomer,
      receivedAt,
    })
    .returning();

  if (existingCustomer) {
    await db.insert(timelineTable).values({
      customerId: existingCustomer.id,
      type: "email_received",
      description: `E-mail mottagen: ${emailRecord.subject}`,
      referenceId: emailRecord.id,
      occurredAt: receivedAt,
    });
  }

  res.json({ ok: true, auto: false });
});

export default router;
