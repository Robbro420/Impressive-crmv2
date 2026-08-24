import { pgTable, serial, integer, text, date, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const calendarLogsTable = pgTable(
  "calendar_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(), // stored as YYYY-MM-DD string
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [unique("calendar_logs_user_id_date_unique").on(t.userId, t.date)],
);

export type CalendarLog = typeof calendarLogsTable.$inferSelect;
export type InsertCalendarLog = typeof calendarLogsTable.$inferInsert;
