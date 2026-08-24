import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, todosTable } from "@workspace/db";
import {
  CreateTodoBody,
  UpdateTodoBody,
  UpdateTodoParams,
  DeleteTodoParams,
} from "@workspace/api-zod";
import { z } from "zod";

const SendEmailBody = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const router: IRouter = Router();

router.get("/todos", async (_req, res): Promise<void> => {
  const todos = await db
    .select()
    .from(todosTable)
    .orderBy(desc(todosTable.createdAt));
  res.json(todos);
});

router.post("/todos", async (req, res): Promise<void> => {
  const parsed = CreateTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { dueDate, ...rest } = parsed.data;
  const [todo] = await db
    .insert(todosTable)
    .values({
      ...rest,
      dueDate: dueDate ?? null,
    })
    .returning();
  res.status(201).json(todo);
});

router.patch("/todos/:id", async (req, res): Promise<void> => {
  const params = UpdateTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { dueDate, ...rest } = parsed.data;
  const updates: Record<string, unknown> = { ...rest };
  if (dueDate !== undefined) updates.dueDate = dueDate ?? null;

  const [todo] = await db
    .update(todosTable)
    .set(updates)
    .where(eq(todosTable.id, params.data.id))
    .returning();
  if (!todo) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(todo);
});

router.delete("/todos/:id", async (req, res): Promise<void> => {
  const params = DeleteTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(todosTable).where(eq(todosTable.id, params.data.id));
  res.status(204).end();
});

router.post("/todos/:id/send-email", async (req, res): Promise<void> => {
  const params = UpdateTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [todo] = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, params.data.id));

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  const { to, subject, body } = parsed.data;

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    res.status(503).json({ error: "Mejlutskick är inte konfigurerat (RESEND_API_KEY saknas)." });
    return;
  }
  // RESEND_FROM must be a sender on a domain verified in Resend.
  // "onboarding@resend.dev" works for testing (only to your own address).
  const from = process.env["RESEND_FROM"] ?? "Impressive CRM <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    res.status(502).json({ error: `Resend error: ${errText}` });
    return;
  }

  const data = await response.json() as { id?: string };
  res.json({ ok: true, messageId: data.id ?? null });
});

export default router;
