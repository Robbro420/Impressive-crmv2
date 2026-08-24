import { pgTable, text, serial, timestamp, boolean, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const todosTable = pgTable(
  "todos",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    done: boolean("done").notNull().default(false),
    dueDate: timestamp("due_date", { withTimezone: true }),
    customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
    notifyEmails: text("notify_emails"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [index("todos_customer_id_idx").on(t.customerId)],
);

export const insertTodoSchema = createInsertSchema(todosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Todo = typeof todosTable.$inferSelect;
