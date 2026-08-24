/**
 * migrate-from-old.ts — Engångsflytt av CRM-data från gamla Replit-databasen
 * till den nya Neon-databasen.
 *
 *   OLD_DATABASE_URL=... DATABASE_URL=... pnpm --filter @workspace/scripts exec tsx src/migrate-from-old.ts
 *
 * - TÖMMER måltabellerna (customers, orders, emails, timeline_events, todos,
 *   cases, goals) — endast testdata får finnas där.
 * - Rör INTE users eller calendar_logs i målet.
 * - Behåller ID:n så alla kopplingar (kund→order→tidslinje) förblir intakta.
 * - Föräldralösa referenser (gamla databasen saknade foreign keys):
 *   ordrar/tidslinjer utan kund hoppas över, mejl/todos får kopplingen nollad.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const oldUrl = process.env.OLD_DATABASE_URL;
const newUrl = process.env.DATABASE_URL;
if (!oldUrl || !newUrl) throw new Error("OLD_DATABASE_URL och DATABASE_URL krävs");

const src = new Pool({ connectionString: oldUrl });
const dst = new Pool({ connectionString: newUrl });

async function rows(pool: Pool, sql: string): Promise<any[]> {
  return (await pool.query(sql)).rows;
}

async function main() {
  // ── 1. Läs allt från källan ────────────────────────────────────────────────
  const customers = await rows(src, `SELECT * FROM customers ORDER BY id`);
  const orders = await rows(src, `SELECT * FROM orders ORDER BY id`);
  const emails = await rows(src, `SELECT * FROM emails ORDER BY id`);
  const timeline = await rows(src, `SELECT * FROM timeline_events ORDER BY id`);
  const todos = await rows(src, `SELECT * FROM todos ORDER BY id`);
  const goals = await rows(src, `SELECT * FROM goals ORDER BY id`);
  console.log(
    `Källa: ${customers.length} kunder, ${orders.length} ordrar, ${emails.length} mejl, ` +
      `${timeline.length} tidslinjer, ${todos.length} todos, ${goals.length} mål`,
  );

  const customerIds = new Set(customers.map((c) => c.id));
  const emailIds = new Set(emails.map((e) => e.id));

  // ── 2. Töm målet (endast testdata) ────────────────────────────────────────
  await dst.query(`DELETE FROM timeline_events`);
  await dst.query(`DELETE FROM orders`);
  await dst.query(`DELETE FROM emails`);
  await dst.query(`DELETE FROM todos`);
  await dst.query(`DELETE FROM cases`);
  await dst.query(`DELETE FROM goals`);
  await dst.query(`DELETE FROM customers`);
  console.log("Målet tömt (testdata borta).");

  // ── 3. Kunder ─────────────────────────────────────────────────────────────
  for (const c of customers) {
    await dst.query(
      `INSERT INTO customers (id, name, email, phone, company, address, city, postal_code,
                              category, status, customer_number, tags, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        c.id, c.name, c.email ?? "", c.phone, c.company, c.address, c.city, c.postal_code,
        c.category ?? "ovrigt", c.status ?? "aktiv", c.customer_number, c.tags, c.notes,
        c.created_at, c.updated_at,
      ],
    );
  }
  console.log(`✔ ${customers.length} kunder`);

  // ── 4. Mejl (customer_id nollas om kunden saknas) ─────────────────────────
  for (const e of emails) {
    await dst.query(
      `INSERT INTO emails (id, from_email, from_name, subject, body_text, body_html,
                           customer_id, processed, received_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        e.id, e.from_email, e.from_name, e.subject ?? "(utan ämne)", e.body_text, e.body_html,
        e.customer_id != null && customerIds.has(e.customer_id) ? e.customer_id : null,
        e.processed ?? false, e.received_at, e.created_at,
      ],
    );
  }
  console.log(`✔ ${emails.length} mejl`);

  // ── 5. Ordrar (hoppar över föräldralösa) ──────────────────────────────────
  let skippedOrders = 0;
  for (const o of orders) {
    if (o.customer_id == null || !customerIds.has(o.customer_id)) {
      skippedOrders++;
      console.log(`  ⚠ hoppar order #${o.id} (${o.subject ?? "?"}) — kund ${o.customer_id} saknas`);
      continue;
    }
    await dst.query(
      `INSERT INTO orders (id, customer_id, subject, order_text, status, amount, delivery_date,
                           campaign_start, campaign_end, notes, order_number, email_id,
                           order_date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        o.id, o.customer_id, o.subject, o.order_text, o.status ?? "ny", o.amount, o.delivery_date,
        o.campaign_start, o.campaign_end, o.notes, o.order_number,
        o.email_id != null && emailIds.has(o.email_id) ? o.email_id : null,
        o.order_date, o.created_at, o.updated_at,
      ],
    );
  }
  console.log(`✔ ${orders.length - skippedOrders} ordrar${skippedOrders ? ` (${skippedOrders} överhoppade)` : ""}`);

  // ── 6. Tidslinje (hoppar över föräldralösa) ───────────────────────────────
  let skippedTimeline = 0;
  for (const t of timeline) {
    if (t.customer_id == null || !customerIds.has(t.customer_id)) {
      skippedTimeline++;
      continue;
    }
    await dst.query(
      `INSERT INTO timeline_events (id, customer_id, type, description, reference_id, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [t.id, t.customer_id, t.type, t.description, t.reference_id, t.occurred_at],
    );
  }
  console.log(`✔ ${timeline.length - skippedTimeline} tidslinjehändelser${skippedTimeline ? ` (${skippedTimeline} överhoppade)` : ""}`);

  // ── 7. Todos / Mersälj ────────────────────────────────────────────────────
  for (const t of todos) {
    await dst.query(
      `INSERT INTO todos (id, title, description, done, due_date, customer_id, notify_emails,
                          contact_name, contact_phone, contact_email, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        t.id, t.title, t.description, t.done ?? false, t.due_date,
        t.customer_id != null && customerIds.has(t.customer_id) ? t.customer_id : null,
        t.notify_emails, t.contact_name, t.contact_phone, t.contact_email,
        t.created_at, t.updated_at,
      ],
    );
  }
  console.log(`✔ ${todos.length} Mersälj/todos`);

  // ── 8. Mål ────────────────────────────────────────────────────────────────
  for (const g of goals) {
    await dst.query(
      `INSERT INTO goals (id, name, metric, target, current, period, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [g.id, g.name, g.metric, g.target, g.current ?? 0, g.period, g.created_at],
    );
  }
  console.log(`✔ ${goals.length} mål`);

  // ── 9. Nollställ sekvenser ────────────────────────────────────────────────
  for (const table of ["customers", "orders", "emails", "timeline_events", "todos", "goals"]) {
    await dst.query(
      `SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
    );
  }
  console.log("✔ sekvenser uppdaterade");

  // ── 10. Kontrollräkning ───────────────────────────────────────────────────
  for (const table of ["customers", "orders", "emails", "timeline_events", "todos", "goals"]) {
    const n = (await dst.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
    console.log(`  mål ${table}: ${n} rader`);
  }

  console.log("KLART.");
}

main()
  .then(() => Promise.all([src.end(), dst.end()]))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
    return Promise.all([src.end(), dst.end()]);
  });
