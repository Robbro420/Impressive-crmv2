import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { calendarLogsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns all entries for the logged-in user in the date range.
router.get("/calendar", async (req, res): Promise<void> => {
  const from = typeof req.query.from === "string" ? req.query.from : null;
  const to = typeof req.query.to === "string" ? req.query.to : null;
  const userId = req.user!.userId;

  if (!from || !to) {
    res.status(400).json({ error: "Parametrarna from och to krävs (YYYY-MM-DD)" });
    return;
  }

  const entries = await db
    .select()
    .from(calendarLogsTable)
    .where(
      and(
        eq(calendarLogsTable.userId, userId),
        gte(calendarLogsTable.date, from),
        lte(calendarLogsTable.date, to),
      ),
    );
  res.json(entries);
});

// PUT /api/calendar/:date — upsert (create or update) entry for a date
const DateParam = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const UpsertBody = z.object({ content: z.string() });

router.put("/calendar/:date", async (req, res): Promise<void> => {
  const params = DateParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Ogiltigt datumformat, använd YYYY-MM-DD" });
    return;
  }
  const body = UpsertBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "content krävs" });
    return;
  }
  const userId = req.user!.userId;
  const { date } = params.data;
  const { content } = body.data;

  // If content is empty, delete the entry
  if (!content.trim()) {
    await db
      .delete(calendarLogsTable)
      .where(and(eq(calendarLogsTable.userId, userId), eq(calendarLogsTable.date, date)));
    res.json({ deleted: true });
    return;
  }

  // Upsert via insert + on conflict update
  const [entry] = await db
    .insert(calendarLogsTable)
    .values({ userId, date, content: content.trim() })
    .onConflictDoUpdate({
      target: [calendarLogsTable.userId, calendarLogsTable.date],
      set: { content: content.trim(), updatedAt: new Date() },
    })
    .returning();
  res.json(entry);
});

// DELETE /api/calendar/:date
router.delete("/calendar/:date", async (req, res): Promise<void> => {
  const params = DateParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Ogiltigt datumformat" });
    return;
  }
  const userId = req.user!.userId;
  await db
    .delete(calendarLogsTable)
    .where(and(eq(calendarLogsTable.userId, userId), eq(calendarLogsTable.date, params.data.date)));
  res.json({ deleted: true });
});

export default router;
