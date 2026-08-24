import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, customersTable, timelineTable } from "@workspace/db";
import {
  CreateOrderBody,
  UpdateOrderBody,
  UpdateOrderParams,
  GetOrderParams,
  DeleteOrderParams,
  ListOrdersQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function withCustomerName(order: typeof ordersTable.$inferSelect) {
  if (!order.customerId) return { ...order, customerName: null };
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId));
  return { ...order, customerName: customer?.name ?? null };
}

router.get("/orders", async (req, res): Promise<void> => {
  const params = ListOrdersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let orders = await db.select().from(ordersTable).orderBy(ordersTable.orderDate);

  if (params.data.customerId != null) {
    orders = orders.filter((o) => o.customerId === params.data.customerId);
  }
  if (params.data.status) {
    orders = orders.filter((o) => o.status === params.data.status);
  }

  // Fetch customer names in batch
  const customerIds = [...new Set(orders.map((o) => o.customerId))];
  const customers = customerIds.length
    ? await db.select().from(customersTable)
    : [];
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const enriched = orders.reverse().map((o) => ({
    ...o,
    customerName: customerMap[o.customerId] ?? null,
  }));

  res.json(enriched);
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount, deliveryDate, ...rest } = parsed.data;

  const [order] = await db
    .insert(ordersTable)
    .values({
      ...rest,
      amount: amount != null ? String(amount) : null,
      deliveryDate: deliveryDate ? deliveryDate.toISOString().slice(0, 10) : null,
    })
    .returning();

  // Add timeline event
  await db.insert(timelineTable).values({
    customerId: order.customerId,
    type: "order_created",
    description: `Order skapad: ${order.subject ?? "Ny order"}`,
    referenceId: order.id,
    occurredAt: new Date(),
  });

  res.status(201).json({ ...order, customerName: null });
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const enriched = await withCustomerName(order);
  res.json(enriched);
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amount: updAmount, deliveryDate: updDeliveryDate, ...restUpdates } = parsed.data;
  const updates: Record<string, unknown> = { ...restUpdates };
  if (updAmount !== undefined) updates.amount = String(updAmount);
  if (updDeliveryDate !== undefined)
    updates.deliveryDate = updDeliveryDate.toISOString().slice(0, 10);

  const [order] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Timeline event for status change
  if (parsed.data.status) {
    await db.insert(timelineTable).values({
      customerId: order.customerId,
      type: "status_changed",
      description: `Orderstatus ändrad till: ${parsed.data.status}`,
      referenceId: order.id,
      occurredAt: new Date(),
    });
  }

  const enriched = await withCustomerName(order);
  res.json(enriched);
});

router.delete("/orders/:id", async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .delete(ordersTable)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
