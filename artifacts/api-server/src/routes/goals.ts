import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import {
  CreateGoalBody,
  UpdateGoalBody,
  UpdateGoalParams,
  DeleteGoalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/goals", async (_req, res): Promise<void> => {
  const goals = await db.select().from(goalsTable).orderBy(goalsTable.createdAt);
  res.json(goals.map((g) => ({
    ...g,
    target: parseFloat(g.target),
    current: parseFloat(g.current),
  })));
});

router.post("/goals", async (req, res): Promise<void> => {
  const parsed = CreateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [goal] = await db.insert(goalsTable).values({
    name: parsed.data.name,
    metric: parsed.data.metric,
    target: String(parsed.data.target),
    period: parsed.data.period,
  }).returning();

  res.status(201).json({ ...goal, target: parseFloat(goal.target), current: parseFloat(goal.current) });
});

router.patch("/goals/:id", async (req, res): Promise<void> => {
  const params = UpdateGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.target != null) updates.target = String(parsed.data.target);
  if (parsed.data.current != null) updates.current = String(parsed.data.current);
  if (parsed.data.period != null) updates.period = parsed.data.period;

  const [goal] = await db
    .update(goalsTable)
    .set(updates)
    .where(eq(goalsTable.id, params.data.id))
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  res.json({ ...goal, target: parseFloat(goal.target), current: parseFloat(goal.current) });
});

router.delete("/goals/:id", async (req, res): Promise<void> => {
  const params = DeleteGoalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [goal] = await db
    .delete(goalsTable)
    .where(eq(goalsTable.id, params.data.id))
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
