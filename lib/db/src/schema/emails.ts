import { pgTable, text, serial, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const emailsTable = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    subject: text("subject").notNull(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
    processed: boolean("processed").notNull().default(false),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("emails_customer_id_idx").on(t.customerId),
    index("emails_received_at_idx").on(t.receivedAt),
  ],
);

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, createdAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
