/**
 * scheduler.ts — Bakgrundsjobb som körs vid start och därefter varje timme.
 *
 * Kampanj-auto-transition:
 *   Ordrar med status "aktiv" vars campaign_end har passerat flyttas
 *   automatiskt till status "uppföljning" och får:
 *   - ett mersälj-todo ("💡 Mersälj – <kund>")
 *   - en timeline-händelse hos kunden
 *
 * Samtidighetssäkert: varje order "claimas" atomiskt med
 * UPDATE ... WHERE status='aktiv' RETURNING inuti en transaktion tillsammans
 * med todo- och timeline-skrivningarna. Två samtidiga körningar kan därför
 * aldrig processa samma order två gånger, och en krasch rullar tillbaka
 * hela ordern så nästa körning tar den igen.
 */
import { db, ordersTable, customersTable, todosTable, timelineTable } from "@workspace/db";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import type { Logger } from "pino";

async function transitionExpiredCampaigns(logger: Logger): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Kandidater (lässteg — det atomiska claimet sker per order nedan)
  const candidates = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.status, "aktiv"),
        isNotNull(ordersTable.campaignEnd),
        lt(ordersTable.campaignEnd, today),
      ),
    );

  let transitioned = 0;

  for (const { id } of candidates) {
    try {
      await db.transaction(async (tx) => {
        // Atomiskt claim: bara EN körning kan flytta ordern från "aktiv".
        const [order] = await tx
          .update(ordersTable)
          .set({ status: "uppföljning" })
          .where(
            and(
              eq(ordersTable.id, id),
              eq(ordersTable.status, "aktiv"),
              isNotNull(ordersTable.campaignEnd),
              lt(ordersTable.campaignEnd, today),
            ),
          )
          .returning();

        if (!order) return; // någon annan hann före — hoppa över

        const [customer] = await tx
          .select({ name: customersTable.name })
          .from(customersTable)
          .where(eq(customersTable.id, order.customerId));
        const customerName = customer?.name ?? "Kund";

        await tx.insert(todosTable).values({
          title: `💡 Mersälj – ${customerName}`,
          description: `Kampanjen "${order.subject ?? `Order ${order.orderNumber ?? order.id}`}" (order #${order.orderNumber ?? order.id}) avslutades ${order.campaignEnd}. Följ upp och presentera nytt erbjudande.`,
          done: false,
          customerId: order.customerId,
        });

        await tx.insert(timelineTable).values({
          customerId: order.customerId,
          type: "status_changed",
          description: `Kampanj avslutad — flyttad till uppföljning/mersälj`,
          referenceId: order.id,
          occurredAt: new Date(),
        });

        transitioned++;
      });
    } catch (err) {
      logger.error({ err, orderId: id }, "Kampanj-transition misslyckades för order");
    }
  }

  if (transitioned > 0) {
    logger.info({ count: transitioned }, "Kampanjer flyttade till uppföljning");
  }
}

export function startScheduler(logger: Logger): void {
  const run = () =>
    transitionExpiredCampaigns(logger).catch((err) =>
      logger.error({ err }, "Scheduler: kampanj-transition misslyckades"),
    );

  run(); // direkt vid boot
  setInterval(run, 60 * 60 * 1000); // varje timme
}
