import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import emailsRouter from "./emails";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";
import todosRouter from "./todos";
import casesRouter from "./cases";
import authRouter from "./auth";
import calendarRouter from "./calendar";
import importRouter from "./import";
import cronRouter from "./cron";
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

// ── Public routes (no cookie needed) ────────────────────────────────────────
router.use(authRouter);   // /auth/login, /auth/logout, /auth/me
router.use(healthRouter);
router.use(cronRouter);   // /cron/* — protected by CRON_SECRET bearer token

// ── Auth guard — protects everything below (webhook bypassed inside middleware)
router.use(requireAuth);
router.use(customersRouter);
router.use(ordersRouter);
router.use(emailsRouter);   // includes /emails/webhook (bypassed by requireAuth, token-protected)
router.use(goalsRouter);
router.use(dashboardRouter);
router.use(todosRouter);
router.use(casesRouter);
router.use(calendarRouter);
router.use(importRouter);

export default router;
