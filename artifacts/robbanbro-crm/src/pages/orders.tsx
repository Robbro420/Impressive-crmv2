import { useState } from "react"
import { useListOrders } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLocation } from "wouter"
import { PackageOpen, Plus } from "lucide-react"

const STATUSES = [
  { id: "alla", label: "Alla" },
  { id: "ny", label: "Ny" },
  { id: "produktion", label: "Produktion" },
  { id: "aktiv", label: "Aktiv kampanj" },
  { id: "uppföljning", label: "Uppföljning" },
  { id: "klar", label: "Klar" },
  { id: "levererad", label: "Levererad" },
  { id: "avbokad", label: "Avbokad" }
]

export function getOrderStatusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'ny': return 'info'
    case 'produktion': return 'warning'
    case 'klar': return 'success'
    case 'levererad': return 'secondary'
    case 'avbokad': return 'destructive'
    default: return 'default'
  }
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState("alla")
  
  const { data: orders, isLoading } = useListOrders({
    status: activeTab === "alla" ? undefined : activeTab
  })
  
  const [, setLocation] = useLocation()

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orderöversikt</h1>
          <p className="text-muted-foreground mt-1 text-sm">Spåra och hantera hela produktionsflödet.</p>
        </div>
        <button 
          onClick={() => setLocation('/orders/new')}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ny Order
        </button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-0 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center p-4 gap-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none w-full">
              {STATUSES.map(stat => (
                <button
                  key={stat.id}
                  onClick={() => setActiveTab(stat.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    activeTab === stat.id 
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {stat.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Order ID / Datum</th>
                  <th className="px-6 py-3.5 font-medium">Kund</th>
                  <th className="px-6 py-3.5 font-medium">Ämne</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Belopp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i} className="animate-pulse bg-background">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-48 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : orders && orders.length > 0 ? (
                  orders.map(order => (
                    <tr 
                      key={order.id} 
                      className="bg-background hover:bg-secondary/30 transition-colors cursor-pointer group"
                      onClick={() => setLocation(`/customers/${order.customerId}?tab=ordrar&orderId=${order.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-foreground font-medium group-hover:text-primary transition-colors">{order.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(order.orderDate).toLocaleDateString('sv-SE')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{order.customerName}</div>
                      </td>
                      <td className="px-6 py-4 text-foreground max-w-[300px] truncate">
                        {order.subject || <span className="text-muted-foreground italic">Inget ämne</span>}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-foreground">
                        {order.amount ? `${order.amount.toLocaleString('sv-SE')} kr` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground bg-background">
                      <div className="flex flex-col items-center justify-center">
                        <PackageOpen className="h-10 w-10 mb-4 text-muted" />
                        <p className="font-medium text-foreground text-base">Inga ordrar hittades</p>
                        <p className="text-sm mt-1">Finns inga ordrar med denna status för tillfället.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
