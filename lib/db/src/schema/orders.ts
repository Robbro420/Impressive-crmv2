import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  subject: text("subject"),
  orderText: text("order_text"),
  status: text("status").notNull().default("ny"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  deliveryDate: text("delivery_date"),
  campaignStart: text("campaign_start"),
  campaignEnd: text("campaign_end"),
  notes: text("notes"),
  orderNumber: text("order_number"),
  emailId: integer("email_id"),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
