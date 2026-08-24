import { Router, type IRouter } from "express";
import { eq, ilike, or, and } from "drizzle-orm";
import { db, customersTable, ordersTable, emailsTable, timelineTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
  GetCustomerParams,
  DeleteCustomerParams,
  GetCustomerTimelineParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const { category, status, search } = req.query as Record<string, string>;

  let customers = await db.select().from(customersTable).orderBy(customersTable.createdAt);

  if (category) {
    customers = customers.filter((c) => c.category === category);
  }
  if (status) {
    customers = customers.filter((c) => c.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
    );
  }

  // Attach order counts and total value
  const allOrders = await db.select().from(ordersTable);
  const enriched = customers.map((c) => {
    const cOrders = allOrders.filter((o) => o.customerId === c.id);
    const totalValue = cOrders.reduce((sum, o) => sum + parseFloat(o.amount ?? "0"), 0);
    return { ...c, totalOrders: cOrders.length, totalValue };
  });

  res.json(enriched);
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db.insert(customersTable).values(parsed.data).returning();
  res.status(201).json({ ...customer, totalOrders: 0, totalValue: 0 });
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, customer.id));
  const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.amount ?? "0"), 0);

  res.json({ ...customer, totalOrders: orders.length, totalValue });
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [customer] = await db
    .update(customersTable)
    .set(parsed.data)
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json({ ...customer, totalOrders: null, totalValue: null });
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .delete(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/customers/:id/timeline", async (req, res): Promise<void> => {
  const params = GetCustomerTimelineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const events = await db
    .select()
    .from(timelineTable)
    .where(eq(timelineTable.customerId, params.data.id))
    .orderBy(timelineTable.occurredAt);

  res.json(events.reverse());
});

export default router;
