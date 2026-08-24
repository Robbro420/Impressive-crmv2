import { Router, type IRouter } from "express";
import { db, customersTable, ordersTable } from "@workspace/db";

const router: IRouter = Router();

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const monthStart = startOfMonth(now);

  const [allCustomers, allOrders] = await Promise.all([
    db.select().from(customersTable),
    db.select().from(ordersTable),
  ]);

  const awaitingProduction = allOrders.filter((o) => o.status === "produktion" || o.status === "ny").length;
  const activeCampaigns = allOrders.filter((o) => o.status === "aktiv").length;

  const thisWeekOrders = allOrders.filter(
    (o) => new Date(o.orderDate) >= thisWeekStart && o.status !== "avbokad"
  );
  const lastWeekOrders = allOrders.filter(
    (o) =>
      new Date(o.orderDate) >= lastWeekStart &&
      new Date(o.orderDate) < thisWeekStart &&
      o.status !== "avbokad"
  );

  const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + parseFloat(o.amount ?? "0"), 0);
  const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + parseFloat(o.amount ?? "0"), 0);

  const revenueChangePercent =
    lastWeekRevenue === 0
      ? thisWeekRevenue > 0
        ? 100
        : 0
      : ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;

  const newCustomersThisMonth = allCustomers.filter(
    (c) => new Date(c.createdAt) >= monthStart
  ).length;

  const completedThisWeek = allOrders.filter(
    (o) => o.status === "klar" && new Date(o.updatedAt) >= thisWeekStart
  ).length;

  res.json({
    totalCustomers: allCustomers.length,
    totalOrders: allOrders.length,
    awaitingProduction,
    activeCampaigns,
    thisWeekRevenue,
    lastWeekRevenue,
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    newCustomersThisMonth,
    completedOrdersThisWeek: completedThisWeek,
  });
});

router.get("/dashboard/sales-trend", async (req, res): Promise<void> => {
  const weeks = parseInt((req.query.weeks as string) ?? "8", 10);
  const now = new Date();
  const thisWeekStart = startOfWeek(now);

  const allOrders = await db.select().from(ordersTable);

  const result = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(thisWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekOrders = allOrders.filter(
      (o) =>
        new Date(o.orderDate) >= weekStart &&
        new Date(o.orderDate) < weekEnd &&
        o.status !== "avbokad"
    );

    const revenue = weekOrders.reduce((sum, o) => sum + parseFloat(o.amount ?? "0"), 0);
    const weekLabel = `v.${getWeekNumber(weekStart)}`;

    result.push({
      week: weekLabel,
      revenue: Math.round(revenue),
      orderCount: weekOrders.length,
    });
  }

  res.json(result);
});

router.get("/dashboard/production-queue", async (_req, res): Promise<void> => {
  const [orders, customers] = await Promise.all([
    db.select().from(ordersTable),
    db.select().from(customersTable),
  ]);
  const production = orders.filter((o) => o.status === "produktion" || o.status === "ny");
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const enriched = production.map((o) => ({ ...o, customerName: customerMap[o.customerId] ?? null }));
  res.json(enriched);
});

router.get("/dashboard/active-campaigns", async (_req, res): Promise<void> => {
  const [orders, customers] = await Promise.all([
    db.select().from(ordersTable),
    db.select().from(customersTable),
  ]);
  const active = orders.filter((o) => o.status === "aktiv");
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const enriched = active.map((o) => ({ ...o, customerName: customerMap[o.customerId] ?? null }));
  res.json(enriched);
});

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
