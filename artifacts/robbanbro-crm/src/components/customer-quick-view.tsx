import {
  useGetCustomer,
  useListOrders,
  useListTodos,
  getGetCustomerQueryKey,
  getListOrdersQueryKey,
  getListTodosQueryKey,
} from "@workspace/api-client-react"
import { useLocation } from "wouter"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mail, Phone, MapPin, Building, Package, FileText,
  ArrowRight, Loader2, CheckSquare, Square,
} from "lucide-react"
import { getOrderStatusBadgeVariant } from "@/pages/orders"
import { cn } from "@/lib/utils"

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

export function CustomerQuickView({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [, setLocation] = useLocation()
  const enabled = open && !!customerId

  const { data: customer, isLoading } = useGetCustomer(customerId ?? 0, {
    query: { enabled, queryKey: getGetCustomerQueryKey(customerId ?? 0) },
  })
  const { data: orders } = useListOrders(
    { customerId: customerId ?? 0 },
    { query: { enabled, queryKey: getListOrdersQueryKey({ customerId: customerId ?? 0 }) } },
  )
  const { data: allTodos = [] } = useListTodos({
    query: { enabled, queryKey: getListTodosQueryKey() },
  })
  const todos = allTodos.filter((t) => t.customerId === customerId && !t.done)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {isLoading || !customer ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-8">
                <span className="truncate">{customer.name}</span>
                {customer.status && (
                  <Badge variant="outline" className="shrink-0 capitalize">{customer.status}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Kontaktuppgifter */}
            <div className="space-y-2 text-sm">
              {customer.company && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4 shrink-0" />
                  <span className="truncate">{customer.company}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`mailto:${customer.email}`} className="truncate text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {[customer.address, customer.postalCode, customer.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Anteckningar */}
            {customer.notes && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  <FileText className="h-3.5 w-3.5" /> Anteckningar
                </div>
                <p className="whitespace-pre-wrap line-clamp-4">{customer.notes}</p>
              </div>
            )}

            {/* Ordrar */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                <Package className="h-3.5 w-3.5" /> Ordrar ({orders?.length ?? 0})
              </div>
              {orders && orders.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex-1 truncate">{order.subject || "Ingen ämnesrad"}</span>
                      <Badge variant={getOrderStatusBadgeVariant(order.status)} className="shrink-0 capitalize">
                        {order.status}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {formatDate(order.orderDate)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Inga ordrar ännu.</p>
              )}
            </div>

            {/* Öppna att-göra */}
            {todos.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                  <CheckSquare className="h-3.5 w-3.5" /> Mersälj ({todos.length})
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2 text-sm">
                      <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className={cn("truncate")}>{todo.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full kundvy */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false)
                setLocation(`/customers/${customer.id}`)
              }}
            >
              Öppna hela kundkortet <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
