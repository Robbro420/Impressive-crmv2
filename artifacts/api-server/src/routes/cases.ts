import { Router, type IRouter } from "express";
import { eq, desc, and, type SQL } from "drizzle-orm";
import { db, casesTable, customersTable } from "@workspace/db";
import {
  CreateCaseBody,
  UpdateCaseBody,
  UpdateCaseParams,
  DeleteCaseParams,
  ListCasesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases", async (req, res): Promise<void> => {
  const query = ListCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions: SQL[] = [];
  if (query.data.customerId !== undefined) {
    conditions.push(eq(casesTable.customerId, query.data.customerId));
  }
  if (query.data.status !== undefined) {
    conditions.push(eq(casesTable.status, query.data.status));
  }
  const rows = await db
    .select({
      id: casesTable.id,
      title: casesTable.title,
      description: casesTable.description,
      status: casesTable.status,
      customerId: casesTable.customerId,
      customerName: customersTable.name,
      createdAt: casesTable.createdAt,
      updatedAt: casesTable.updatedAt,
    })
    .from(casesTable)
    .leftJoin(customersTable, eq(casesTable.customerId, customersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(casesTable.createdAt));

  res.json(rows);
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [created] = await db.insert(casesTable).values(parsed.data).returning();
  res.status(201).json(created);
});

router.patch("/cases/:id", async (req, res): Promise<void> => {
  const params = UpdateCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(casesTable)
    .set(parsed.data)
    .where(eq(casesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/cases/:id", async (req, res): Promise<void> => {
  const params = DeleteCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(casesTable).where(eq(casesTable.id, params.data.id));
  res.status(204).end();
});

export default router;
