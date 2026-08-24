import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";

export const calendarLogsTable = pgTable("calendar_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),          // stored as YYYY-MM-DD string
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CalendarLog = typeof calendarLogsTable.$inferSelect;
export type InsertCalendarLog = typeof calendarLogsTable.$inferInsert;
