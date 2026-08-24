import { useState } from "react"
import { useListCustomers } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link, useLocation } from "wouter"
import { Search, Plus, Users } from "lucide-react"

const CATEGORIES = [
  { id: "alla", label: "Alla" },
  { id: "privat", label: "Privat" },
  { id: "foretag", label: "Företag" },
  { id: "grossist", label: "Grossist" },
  { id: "ovrigt", label: "Övrigt" }
]

export default function Customers() {
  const [activeTab, setActiveTab] = useState("alla")
  const [search, setSearch] = useState("")
  
  const { data: customers, isLoading } = useListCustomers({
    category: activeTab === "alla" ? undefined : activeTab,
    search: search || undefined
  })
  
  const [, setLocation] = useLocation()

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kundlista</h1>
          <p className="text-muted-foreground mt-1 text-sm">Hantera dina kundrelationer och prospekt.</p>
        </div>
        <button 
          onClick={() => setLocation('/customers/new')}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ny Kund
        </button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-0 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none w-full md:w-auto">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                    activeTab === cat.id 
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:max-w-xs shrink-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="search"
                placeholder="Sök namn, email, företag..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/30 text-muted-foreground border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Namn / Företag</th>
                  <th className="px-6 py-3.5 font-medium">Kontakt</th>
                  <th className="px-6 py-3.5 font-medium">Kategori</th>
                  <th className="px-6 py-3.5 font-medium">Status</th>
                  <th className="px-6 py-3.5 font-medium text-right">Ordrar / Värde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i} className="animate-pulse bg-background">
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-16 bg-muted rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : customers && customers.length > 0 ? (
                  customers.map(customer => (
                    <tr 
                      key={customer.id} 
                      className="bg-background hover:bg-secondary/30 transition-colors cursor-pointer group"
                      onClick={() => setLocation(`/customers/${customer.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">{customer.name}</div>
                        {customer.company && <div className="text-xs text-muted-foreground mt-0.5">{customer.company}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-foreground">{customer.email}</div>
                        {customer.phone && <div className="text-xs text-muted-foreground mt-0.5">{customer.phone}</div>}
                      </td>
                      <td className="px-6 py-4 capitalize text-muted-foreground">{customer.category}</td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          customer.status === "aktiv" ? "success" : 
                          customer.status === "prospect" ? "info" : "secondary"
                        }>
                          {customer.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-foreground">{customer.totalOrders || 0} st</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {customer.totalValue ? `${customer.totalValue.toLocaleString('sv-SE')} kr` : '0 kr'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground bg-background">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-10 w-10 mb-4 text-muted" />
                        <p className="font-medium text-foreground text-base">Inga kunder hittades</p>
                        <p className="text-sm mt-1">Prova att ändra sökningen eller kategorin.</p>
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
