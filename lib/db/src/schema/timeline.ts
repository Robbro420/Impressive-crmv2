import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timelineTable = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  referenceId: integer("reference_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimelineSchema = createInsertSchema(timelineTable).omit({ id: true });
export type InsertTimeline = z.infer<typeof insertTimelineSchema>;
export type TimelineEvent = typeof timelineTable.$inferSelect;
