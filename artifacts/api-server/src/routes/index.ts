import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import emailsRouter from "./emails";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";
import todosRouter from "./todos";
import casesRouter from "./cases";
import chatRouter from "./chat";
import sendEmailRouter from "./send-email";
import authRouter from "./auth";
import calendarRouter from "./calendar";
import importRouter from "./import";
import { requireAuth } from "../middleware/require-auth";
import googleRouter from "./google";

const router: IRouter = Router();

// ── Public routes (no cookie needed) ────────────────────────────────────────
router.use(authRouter);   // /auth/login, /auth/logout, /auth/me
router.use(healthRouter);

// ── Auth guard — protects everything below (webhook bypassed inside middleware)
router.use(requireAuth);
router.use(customersRouter);
router.use(ordersRouter);
router.use(emailsRouter);   // includes /emails/webhook (bypassed by requireAuth)
router.use(goalsRouter);
router.use(dashboardRouter);
router.use(todosRouter);
router.use(casesRouter);
router.use(chatRouter);
router.use(sendEmailRouter);
router.use(calendarRouter);
router.use(importRouter);
router.use(googleRouter);

export default router;
