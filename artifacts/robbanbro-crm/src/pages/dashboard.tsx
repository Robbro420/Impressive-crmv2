import { useState } from "react"
import { 
  useGetDashboardSummary, 
  useGetSalesTrend,
  useGetProductionQueue,
  useGetActiveCampaigns,
  useUpdateOrder,
  useCreateTodo,
  useListOrders,
  getGetProductionQueueQueryKey,
  getGetActiveCampaignsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListTodosQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react"
import type { EnrichedOrder } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { TrendingUp, Package, Megaphone, ArrowRight, GripVertical, CheckCircle2, X, Sparkles, Loader2, PhoneOutgoing, FileText, Rocket } from "lucide-react"
import { Link } from "wouter"
import { cn } from "@/lib/utils"
import { CustomerQuickView } from "@/components/customer-quick-view"
import { DailyNotes } from "@/components/daily-notes"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

// ── Upsell dialog ─────────────────────────────────────────────────────────────
function UpsellDialog({
  order,
  onConfirm,
  onSkip,
  loading,
}: {
  order: EnrichedOrder
  onConfirm: () => void
  onSkip: () => void
  loading: boolean
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px 28px",
        maxWidth: 400, width: "calc(100% - 32px)",
        boxShadow: "0 24px 80px rgba(20,20,43,0.16)",
        border: "1px solid rgba(20,20,43,0.06)",
        animation: "upsell-in 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "hsl(var(--primary))",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16, boxShadow: "0 8px 24px rgba(20,20,43,0.12)",
        }}>
          <Sparkles size={22} color="#fff" />
        </div>

        <h3 style={{ fontWeight: 800, fontSize: 17, margin: "0 0 6px", color: "#111" }}>
          🎉 Kampanj avslutad!
        </h3>
        <p style={{ fontSize: 14, color: "#555", margin: "0 0 20px", lineHeight: 1.5 }}>
          <strong>{order.customerName || "Kunden"}</strong> är klar.
          Vill du skapa ett <strong>mersälj-uppföljning</strong> så ni inte tappar kontakten?
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 42, borderRadius: 11, border: "none",
              background: "hsl(var(--primary))",
              color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 1px 3px rgba(20,20,43,0.12)",
              fontFamily: "inherit",
            }}
          >
            {loading
              ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              : <><Sparkles size={14} /> Ja, skapa uppföljning</>}
          </button>
          <button
            onClick={onSkip}
            disabled={loading}
            style={{
              height: 42, paddingInline: 16, borderRadius: 11,
              border: "1.5px solid #e5e7eb", background: "#fff",
              color: "#666", fontWeight: 600, fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit",
            }}
          >
            <X size={14} /> Nej tack
          </button>
        </div>
      </div>
      <style>{`
        @keyframes upsell-in {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Draggable card ────────────────────────────────────────────────────────────
function DraggableOrderCard({
  order,
  accentColor,
  onMarkDone,
  onOpenCustomer,
}: {
  order: EnrichedOrder
  accentColor?: string
  onMarkDone: (order: EnrichedOrder) => void
  onOpenCustomer: (customerId: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
  })
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }

  return (
    <div ref={setNodeRef} style={style}>
      <OrderCardContent
        order={order}
        dragListeners={listeners}
        dragAttributes={attributes}
        accentColor={accentColor}
        onMarkDone={onMarkDone}
        onOpenCustomer={onOpenCustomer}
      />
    </div>
  )
}

// ── Card content (also used in DragOverlay) ──────────────────────────────────
function OrderCardContent({
  order,
  dragListeners,
  dragAttributes,
  accentColor,
  overlay,
  onMarkDone,
  onOpenCustomer,
}: {
  order: EnrichedOrder
  dragListeners?: ReturnType<typeof useDraggable>["listeners"]
  dragAttributes?: ReturnType<typeof useDraggable>["attributes"]
  accentColor?: string
  overlay?: boolean
  onMarkDone?: (order: EnrichedOrder) => void
  onOpenCustomer?: (customerId: number) => void
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-3 group transition-all",
      overlay ? "shadow-2xl rotate-1 scale-105" : "hover:border-primary/30 hover:shadow-sm"
    )}>
      {/* Drag handle */}
      <div
        {...dragListeners}
        {...dragAttributes}
        className="cursor-grab active:cursor-grabbing p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0 touch-none"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Content — click opens customer quick view */}
      <button
        type="button"
        onClick={() => onOpenCustomer?.(order.customerId)}
        className="flex-1 min-w-0 text-left cursor-pointer"
      >
        <p className="text-sm font-bold truncate leading-tight text-foreground group-hover:text-primary transition-colors">
          {order.customerName || "Okänd kund"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {order.subject || "Ingen ämnesrad"}
        </p>
      </button>

      {/* Datum — kampanjslut om det finns, annars orderdatum */}
      {order.campaignEnd ? (
        <span
          className={cn(
            "text-[10px] font-mono shrink-0 font-semibold",
            order.campaignEnd < new Date().toISOString().slice(0, 10)
              ? "text-rose-500"
              : "text-muted-foreground"
          )}
          title={`Kampanj: ${order.campaignStart ?? "?"} → ${order.campaignEnd}`}
        >
          →{new Date(order.campaignEnd + "T12:00:00").toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}
        </span>
      ) : (
        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
          {new Date(order.orderDate).toLocaleDateString("sv-SE", { month: "short", day: "numeric" })}
        </span>
      )}

      {/* Färdig-knapp */}
      {!overlay && onMarkDone && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkDone(order) }}
          title="Markera som färdig"
          className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-all"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ── Pipeline stages (Pipedrive-stil) ─────────────────────────────────────────
// Kolumnernas nycklar är orderns status-värden i databasen.
export const PIPELINE_STAGES = [
  { key: "ny",          label: "Orderbekräftelse",  icon: FileText },
  { key: "produktion",  label: "Annonshantering",   icon: Package },
  { key: "godkänd",     label: "Godkänd för start", icon: CheckCircle2 },
  { key: "aktiv",       label: "Kampanj live",      icon: Rocket },
  { key: "uppföljning", label: "Mersälja!",         icon: PhoneOutgoing },
] as const

function formatSEK(n: number) {
  return `${Math.round(n).toLocaleString("sv-SE")} kr`
}

// ── Droppable column ──────────────────────────────────────────────────────────
function DroppableColumn({
  id,
  label,
  count,
  sum,
  icon: Icon,
  children,
  isEmpty,
}: {
  id: string
  label: string
  count: number
  sum: number
  icon: React.ElementType
  children: React.ReactNode
  isEmpty: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header — Pipedrive-stil: namn, antal och summa */}
      <div className="flex items-start gap-2.5 mb-3 px-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 gradient-bg shadow-sm">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold tracking-tight leading-tight truncate">{label}</p>
          <p className="text-[11px] text-muted-foreground font-semibold">
            {count} st · {formatSEK(sum)}
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-2xl p-2.5 transition-all border-2 overflow-y-auto flex-1",
          isOver
            ? "border-dashed border-primary/60 bg-secondary/70"
            : "border-transparent bg-white/60"
        )}
        style={{ minHeight: 320, maxHeight: 520 }}
      >
        {isEmpty ? (
          <div className="flex items-center justify-center text-sm text-muted-foreground font-medium py-10">
            {isOver ? "Släpp hit ✓" : "Tom"}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary()
  const { data: trend, isLoading: loadingTrend } = useGetSalesTrend({ weeks: 8 })
  const { data: allOrdersRaw = [], isLoading: loadingOrders } = useListOrders()
  const allOrders = allOrdersRaw as unknown as EnrichedOrder[]
  const byStage = (key: string) => allOrders.filter((o) => o.status === key)
  const stageSum = (key: string) =>
    byStage(key).reduce((acc, o) => acc + (o.amount ? Number(o.amount) : 0), 0)
  const updateOrder = useUpdateOrder()
  const createTodo = useCreateTodo()

  const [activeOrder, setActiveOrder] = useState<EnrichedOrder | null>(null)
  const [quickViewCustomerId, setQuickViewCustomerId] = useState<number | null>(null)
  const [quickViewOpen, setQuickViewOpen] = useState(false)
  const openCustomer = (customerId: number) => {
    setQuickViewCustomerId(customerId)
    setQuickViewOpen(true)
  }
  const [upsellOrder, setUpsellOrder] = useState<EnrichedOrder | null>(null)
  const [upsellLoading, setUpsellLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetProductionQueueQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetActiveCampaignsQueryKey() })
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveOrder(event.active.data.current?.order ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null)
    const { active, over } = event
    if (!over) return

    const order: EnrichedOrder = active.data.current?.order
    if (!order) return

    const to = String(over.id)
    if (!PIPELINE_STAGES.some((s) => s.key === to) || order.status === to) return

    // Optimistisk flytt mellan kolumner
    queryClient.setQueryData(
      getListOrdersQueryKey(),
      allOrders.map((o) => (o.id === order.id ? { ...o, status: to } : o)),
    )

    updateOrder.mutate(
      { id: order.id, data: { status: to } },
      { onSuccess: invalidate, onError: invalidate }
    )
  }

  // Mark an order as "klar" — removes it from the board
  const handleMarkDone = (order: EnrichedOrder) => {
    queryClient.setQueryData(
      getListOrdersQueryKey(),
      allOrders.map((o) => (o.id === order.id ? { ...o, status: "klar" } : o)),
    )
    updateOrder.mutate(
      { id: order.id, data: { status: "klar" } },
      { onSuccess: invalidate, onError: invalidate }
    )
    // Show upsell dialog
    setUpsellOrder(order)
  }

  // Create a mersälj follow-up todo and close dialog
  const handleUpsellConfirm = async () => {
    if (!upsellOrder) return
    setUpsellLoading(true)
    await createTodo.mutateAsync({
      data: {
        title: `💡 Mersälj – ${upsellOrder.customerName || "Kund"}`,
        description: `Följ upp med ${upsellOrder.customerName || "kunden"} efter avslutad kampanj "${upsellOrder.subject || ""}". Presentera nytt erbjudande.`,
      },
    })
    queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() })
    setUpsellLoading(false)
    setUpsellOrder(null)
  }

  const isLoading = loadingSummary || loadingTrend

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="space-y-2">
          <div className="h-9 w-52 bg-muted rounded-xl" />
          <div className="h-4 w-64 bg-muted rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-muted rounded-2xl" />)}
        </div>
        <div className="h-[280px] bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-[340px] bg-muted rounded-2xl" />
          <div className="h-[340px] bg-muted rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Översikt</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">Din verksamhet i siffror. Välkommen tillbaka.</p>
      </div>

      {/* Dagens anteckningar */}
      <DailyNotes />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Veckans Omsättning</p>
                <div className="text-3xl font-black tracking-tight">
                  {summary?.thisWeekRevenue?.toLocaleString("sv-SE") || 0}{" "}
                  <span className="text-lg font-bold text-muted-foreground">kr</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className={cn("font-bold", summary?.revenueChangePercent && summary.revenueChangePercent > 0 ? "text-emerald-600" : "text-rose-500")}>
                    {summary?.revenueChangePercent && summary.revenueChangePercent > 0 ? "+" : ""}{summary?.revenueChangePercent || 0}%
                  </span>{" "}jämfört med förra veckan
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 gradient-bg shadow-md shadow-primary/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Annonshantering</p>
                <div className="text-3xl font-black tracking-tight">{loadingOrders ? "–" : byStage("produktion").length}</div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Ordrar som väntar på produktion</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--warning))" }}>
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Kampanjer live</p>
                <div className="text-3xl font-black tracking-tight">{loadingOrders ? "–" : byStage("aktiv").length}</div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Kampanjer som är igång just nu</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--success))" }}>
                <Megaphone className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-black">Försäljningstrend</CardTitle>
          <CardDescription className="font-medium">Omsättning de senaste 8 veckorna</CardDescription>
        </CardHeader>
        <CardContent className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f4" />
              <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} fontFamily="Inter" />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} fontFamily="Inter" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                cursor={{ fill: "rgba(80,89,240,0.06)" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(20,20,43,0.08)", fontSize: "13px", fontFamily: "Inter" }}
                formatter={(value: number) => [`${value.toLocaleString("sv-SE")} kr`, "Omsättning"]}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={36} fill="url(#barGradient)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Kanban board */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight">Pipeline</h2>
          <Link href="/orders" className="text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity gradient-text">
            Se alla ordrar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="grid grid-cols-5 gap-4 min-w-[1180px]">
              {PIPELINE_STAGES.map((stage) => {
                const orders = byStage(stage.key)
                return (
                  <DroppableColumn
                    key={stage.key}
                    id={stage.key}
                    label={stage.label}
                    count={orders.length}
                    sum={stageSum(stage.key)}
                    icon={stage.icon}
                    isEmpty={orders.length === 0}
                  >
                    {orders.map((order) => (
                      <DraggableOrderCard key={order.id} order={order} onMarkDone={handleMarkDone} onOpenCustomer={openCustomer} />
                    ))}
                  </DroppableColumn>
                )
              })}
            </div>
          </div>

          {/* Drag overlay — ghost card that follows the cursor */}
          <DragOverlay>
            {activeOrder && (
              <OrderCardContent order={activeOrder} overlay />
            )}
          </DragOverlay>
        </DndContext>

        <p className="text-xs text-muted-foreground mt-3 font-medium text-center">
          Dra ett kort för att flytta det · Klicka på kortets text för att öppna kunden · <CheckCircle2 className="inline h-3 w-3 text-emerald-500" /> för att markera klart
        </p>
      </div>

      {/* Kundkort-modal */}
      <CustomerQuickView
        customerId={quickViewCustomerId}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />

      {/* Upsell dialog */}
      {upsellOrder && (
        <UpsellDialog
          order={upsellOrder}
          onConfirm={handleUpsellConfirm}
          onSkip={() => setUpsellOrder(null)}
          loading={upsellLoading}
        />
      )}
    </div>
  )
}
