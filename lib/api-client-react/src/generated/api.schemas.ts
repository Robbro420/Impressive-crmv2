export interface HealthStatus {
  status: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  /** @nullable */
  phone?: string | null;
  /** @nullable */
  company?: string | null;
  /** @nullable */
  address?: string | null;
  /** @nullable */
  city?: string | null;
  /** @nullable */
  postalCode?: string | null;
  /** e.g. privat, foretag, grossist, ovrigt */
  category: string;
  /** aktiv, inaktiv, prospect */
  status: string;
  /**
     * Internal customer number (from order confirmation PDF)
     * @nullable
     */
  customerNumber?: string | null;
  /**
     * Comma-separated tags
     * @nullable
     */
  tags?: string | null;
  /** @nullable */
  notes?: string | null;
  /** @nullable */
  totalOrders?: number | null;
  /** @nullable */
  totalValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  /** @minLength 1 */
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  category: string;
  status?: string;
  customerNumber?: string;
  tags?: string;
  notes?: string;
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  category?: string;
  status?: string;
  customerNumber?: string;
  tags?: string;
  notes?: string;
}

export interface Order {
  id: number;
  customerId: number;
  /** @nullable */
  customerName?: string | null;
  /** @nullable */
  subject?: string | null;
  /**
     * Full order text/email body
     * @nullable
     */
  orderText?: string | null;
  /**
     * Order number from order confirmation PDF
     * @nullable
     */
  orderNumber?: string | null;
  /** ny, produktion, aktiv, klar, levererad, avbokad, uppföljning */
  status: string;
  /** @nullable */
  amount?: number | null;
  /** @nullable */
  deliveryDate?: string | null;
  /**
     * Campaign start date
     * @nullable
     */
  campaignStart?: string | null;
  /**
     * Campaign end date — when passed auto-transitions to uppföljning
     * @nullable
     */
  campaignEnd?: string | null;
  /** @nullable */
  notes?: string | null;
  /**
     * Source email ID if created from email
     * @nullable
     */
  emailId?: number | null;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderInput {
  customerId: number;
  subject?: string;
  orderText?: string;
  orderNumber?: string;
  status: string;
  amount?: number;
  deliveryDate?: string;
  /** Campaign start date */
  campaignStart?: string;
  /** Campaign end date */
  campaignEnd?: string;
  notes?: string;
  emailId?: number;
  orderDate: string;
}

export interface OrderUpdate {
  subject?: string;
  orderText?: string;
  status?: string;
  amount?: number;
  deliveryDate?: string;
  /** Campaign start date */
  campaignStart?: string;
  /** Campaign end date */
  campaignEnd?: string;
  notes?: string;
}

export interface Email {
  id: number;
  fromEmail: string;
  /** @nullable */
  fromName?: string | null;
  subject: string;
  /** @nullable */
  bodyText?: string | null;
  /** @nullable */
  bodyHtml?: string | null;
  /** @nullable */
  customerId?: number | null;
  /** @nullable */
  customerName?: string | null;
  processed: boolean;
  receivedAt: string;
  createdAt: string;
}

export interface LinkEmailInput {
  customerId: number;
  /** Also create an order from this email */
  createOrder?: boolean;
}

export type PostmarkWebhookInputAttachmentsItem = {
  Name?: string;
  Content?: string;
  ContentType?: string;
  ContentLength?: number;
};

export interface PostmarkWebhookInput {
  From: string;
  FromName?: string;
  Subject: string;
  TextBody?: string;
  HtmlBody?: string;
  Date?: string;
  Attachments?: PostmarkWebhookInputAttachmentsItem[];
}

export interface Goal {
  id: number;
  name: string;
  /** orders, revenue, new_customers */
  metric: string;
  target: number;
  current?: number;
  /** weekly, monthly, quarterly */
  period: string;
  createdAt: string;
}

export interface GoalInput {
  /** @minLength 1 */
  name: string;
  metric: string;
  target: number;
  period: string;
}

export interface GoalUpdate {
  name?: string;
  target?: number;
  current?: number;
  period?: string;
}

export interface TimelineEvent {
  id: number;
  customerId: number;
  /** order_created, email_received, note_added, status_changed */
  type: string;
  description: string;
  /** @nullable */
  referenceId?: number | null;
  occurredAt: string;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalOrders: number;
  awaitingProduction: number;
  activeCampaigns: number;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  revenueChangePercent: number;
  newCustomersThisMonth: number;
  completedOrdersThisWeek?: number;
}

export interface EnrichedOrder {
  id: number;
  customerId: number;
  /** @nullable */
  customerName?: string | null;
  /** @nullable */
  subject?: string | null;
  /** @nullable */
  orderText?: string | null;
  status: string;
  /** @nullable */
  amount?: string | null;
  /** @nullable */
  deliveryDate?: string | null;
  /** @nullable */
  campaignStart?: string | null;
  /** @nullable */
  campaignEnd?: string | null;
  /** @nullable */
  notes?: string | null;
  /** @nullable */
  orderNumber?: string | null;
  /** @nullable */
  emailId?: number | null;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: number;
  title: string;
  /** @nullable */
  description?: string | null;
  /** öppet | pågående | löst */
  status: string;
  /** @nullable */
  customerId?: number | null;
  /** @nullable */
  customerName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CaseInputStatus = typeof CaseInputStatus[keyof typeof CaseInputStatus];


export const CaseInputStatus = {
  öppet: 'öppet',
  pågående: 'pågående',
  löst: 'löst',
} as const;

export interface CaseInput {
  /** @minLength 1 */
  title: string;
  description?: string;
  status?: CaseInputStatus;
  customerId?: number;
}

export type CaseUpdateStatus = typeof CaseUpdateStatus[keyof typeof CaseUpdateStatus];


export const CaseUpdateStatus = {
  öppet: 'öppet',
  pågående: 'pågående',
  löst: 'löst',
} as const;

export interface CaseUpdate {
  title?: string;
  /** @nullable */
  description?: string | null;
  status?: CaseUpdateStatus;
  /** @nullable */
  customerId?: number | null;
}

export interface Todo {
  id: number;
  title: string;
  /** @nullable */
  description?: string | null;
  done: boolean;
  /** @nullable */
  dueDate?: string | null;
  /** @nullable */
  customerId?: number | null;
  /**
     * Comma-separated email addresses to invite via Google Calendar
     * @nullable
     */
  notifyEmails?: string | null;
  /** @nullable */
  contactName?: string | null;
  /** @nullable */
  contactPhone?: string | null;
  /** @nullable */
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodoInput {
  /** @minLength 1 */
  title: string;
  description?: string;
  dueDate?: string;
  customerId?: number;
  /** Comma-separated email addresses to invite via Google Calendar */
  notifyEmails?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface TodoUpdate {
  title?: string;
  description?: string;
  done?: boolean;
  dueDate?: string;
  customerId?: number;
  notifyEmails?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface SendTodoEmailInput {
  /** Recipient email address */
  to: string;
  subject: string;
  body: string;
}

export interface SendTodoEmailResult {
  ok: boolean;
  messageId?: string;
}

export interface SalesWeek {
  week: string;
  revenue: number;
  orderCount: number;
}

export type ListCustomersParams = {
category?: string;
status?: string;
search?: string;
};

export type ListOrdersParams = {
customerId?: number;
status?: string;
};

export type ListEmailsParams = {
customerId?: number;
processed?: boolean;
};

export type ListCasesParams = {
customerId?: number;
status?: ListCasesStatus;
};

export type ListCasesStatus = typeof ListCasesStatus[keyof typeof ListCasesStatus];


export const ListCasesStatus = {
  öppet: 'öppet',
  pågående: 'pågående',
  löst: 'löst',
} as const;

export type GetSalesTrendParams = {
weeks?: number;
};

export type SyncGmail502 = {
  error: string;
};


/**
 * Generated by orval v8.23.0 🍺
 * Do not edit manually.
 * Api
 * Robbanbro CRM API
 * OpenAPI spec version: 0.1.0
 */
export interface GmailStatus {
  connected: boolean;
  emailAddress?: string | null;
}

export interface GmailSyncResult {
  fetched: number;
  imported: number;
  linked: number;
}
