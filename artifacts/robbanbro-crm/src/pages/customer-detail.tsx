import { useState } from "react"
import { useLocation, useParams } from "wouter"
import {
  useGetCustomer,
  getGetCustomerQueryKey,
  useGetCustomerTimeline,
  getGetCustomerTimelineQueryKey,
  useListOrders,
  getListOrdersQueryKey,
  useListEmails,
  getListEmailsQueryKey,
  useUpdateCustomer,
  useDeleteCustomer,
  useListTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
} from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft, Mail, Phone, MapPin, Building, Calendar,
  Clock, Package, FileText, Copy, Pencil,
  CheckSquare, Square, Trash2, Plus, CalendarClock, ClipboardList,
} from "lucide-react"
import { getOrderStatusBadgeVariant } from "@/pages/orders"
import { cn } from "@/lib/utils"

function isOverdue(iso: string | null | undefined) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

export default function CustomerDetail() {
  const { id } = useParams()
  const customerId = parseInt(id || "0", 10)
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()

  const { data: customer, isLoading } = useGetCustomer(customerId, {
    query: { queryKey: getGetCustomerQueryKey(customerId), enabled: !!customerId }
  })
  const { data: timeline } = useGetCustomerTimeline(customerId, {
    query: { queryKey: getGetCustomerTimelineQueryKey(customerId), enabled: !!customerId }
  })
  const { data: orders } = useListOrders({ customerId }, {
    query: { queryKey: getListOrdersQueryKey({ customerId }), enabled: !!customerId }
  })
  const { data: emails } = useListEmails({ customerId }, {
    query: { queryKey: getListEmailsQueryKey({ customerId }), enabled: !!customerId }
  })
  const { data: allTodos = [] } = useListTodos()
  const todos = allTodos.filter(t => t.customerId === customerId)

  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const createTodo = useCreateTodo()

  // ── Delete customer ───────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const confirmDelete = () => {
    setDeleting(true)
    deleteCustomer.mutate(
      { id: customerId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listCustomers"] })
          setLocation("/customers")
        },
        onError: () => setDeleting(false),
      },
    )
  }
  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

  // ── Edit customer dialog ──────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", company: "",
    address: "", city: "", postalCode: "",
    category: "", status: "", notes: "",
  })
  const [saving, setSaving] = useState(false)

  const openEdit = () => {
    if (!customer) return
    setEditForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      company: customer.company ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      postalCode: customer.postalCode ?? "",
      category: customer.category ?? "ovrigt",
      status: customer.status ?? "aktiv",
      notes: customer.notes ?? "",
    })
    setEditOpen(true)
  }

  const saveEdit = () => {
    setSaving(true)
    updateCustomer.mutate(
      { id: customerId, data: editForm },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getCustomer", customerId] })
          queryClient.invalidateQueries({ queryKey: ["listCustomers"] })
          setEditOpen(false)
          setSaving(false)
        },
        onError: () => setSaving(false),
      }
    )
  }

  // ── Todo helpers ──────────────────────────────────────────────────────────
  const [todoTitle, setTodoTitle] = useState("")
  const [todoOpen, setTodoOpen] = useState(false)
  const [addingTodo, setAddingTodo] = useState(false)

  const invalidateTodos = () => queryClient.invalidateQueries({ queryKey: ["listTodos"] })

  const handleToggleTodo = (todoId: number, done: boolean) => {
    updateTodo.mutate({ id: todoId, data: { done: !done } }, { onSuccess: invalidateTodos })
  }

  const handleDeleteTodo = (todoId: number) => {
    deleteTodo.mutate({ id: todoId }, { onSuccess: invalidateTodos })
  }

  const handleCreateTodo = () => {
    if (!todoTitle.trim()) return
    setAddingTodo(true)
    createTodo.mutate(
      { data: { title: todoTitle.trim(), customerId } },
      {
        onSuccess: () => {
          invalidateTodos()
          setTodoTitle("")
          setTodoOpen(false)
          setAddingTodo(false)
        },
        onError: () => setAddingTodo(false),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-4">
          <div className="h-8 w-8 bg-muted rounded"></div>
          <div>
            <div className="h-8 w-48 bg-muted rounded mb-2"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
        <div className="h-[400px] bg-muted rounded"></div>
      </div>
    )
  }

  if (!customer) {
    return <div className="p-12 text-center text-muted-foreground border rounded-xl border-dashed">Kunden kunde inte hittas.</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setLocation("/customers")}
          className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground transition-colors border border-transparent hover:border-border/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground font-medium">
            {customer.company && (
              <span className="flex items-center gap-1.5 text-foreground">
                <Building className="h-4 w-4 text-muted-foreground" /> {customer.company}
              </span>
            )}
            <span className="capitalize px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">{customer.category}</span>
            <Badge
              variant={customer.status === "aktiv" ? "success" : customer.status === "prospect" ? "info" : "secondary"}
              className="text-[10px] px-2 py-0 h-5"
            >
              {customer.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 shrink-0">
          <Pencil className="h-3.5 w-3.5" />
          Redigera
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="gap-1.5 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Radera
        </Button>
      </div>

      {/* Radera kund-dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Radera {customer.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Kundens <strong className="text-foreground">ordrar och tidslinje raderas permanent</strong>.
            Mejl, Mersälj och ärenden ligger kvar men kopplas loss från kunden.
            Det här går inte att ångra.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Raderar…" : "Ja, radera kunden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="overview" className="flex flex-col md:flex-row gap-8" orientation="vertical">
        <TabsList className="flex flex-row md:flex-col h-auto justify-start p-0 bg-transparent md:w-48 shrink-0 overflow-x-auto space-x-2 md:space-x-0 md:space-y-1">
          <TabsTrigger value="overview" className="justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 border border-transparent md:w-full font-medium">
            Översikt
          </TabsTrigger>
          <TabsTrigger value="orders" className="justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 border border-transparent md:w-full font-medium">
            Ordrar {orders && orders.length > 0 && <span className="ml-auto text-[10px] bg-muted px-1.5 rounded-full">{orders.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="todos" className="justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 border border-transparent md:w-full font-medium">
            Mersälj {todos.filter(t => !t.done).length > 0 && <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 rounded-full">{todos.filter(t => !t.done).length}</span>}
          </TabsTrigger>
          <TabsTrigger value="emails" className="justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 border border-transparent md:w-full font-medium">
            E-mail {emails && emails.length > 0 && <span className="ml-auto text-[10px] bg-muted px-1.5 rounded-full">{emails.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="justify-start px-4 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:border-border/50 border border-transparent md:w-full font-medium">
            Tidslinje
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-w-0 w-full">
          {/* ── Översikt ──────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-0 outline-none space-y-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle>Kontaktinformation</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-0.5">E-post</p>
                      <p className="text-sm text-muted-foreground">{customer.email || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-0.5">Telefon</p>
                      <p className="text-sm text-muted-foreground">{customer.phone || "-"}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-0.5">Adress</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {customer.address ? (
                          <>{customer.address}<br />{customer.postalCode} {customer.city}</>
                        ) : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle>Anteckningar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                  {customer.notes || <span className="text-muted-foreground italic">Inga anteckningar ännu. Klicka Redigera för att lägga till.</span>}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Ordrar ────────────────────────────────────────────────────── */}
          <TabsContent value="orders" className="mt-0 outline-none space-y-6">
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id} className="shadow-sm border-border/50 overflow-hidden">
                    <div className="bg-secondary/40 p-5 border-b border-border/50 flex flex-col sm:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="font-semibold text-lg text-foreground">
                            {order.orderNumber ? `Order #${order.orderNumber}` : `Order #${order.id}`}
                          </h3>
                          <Badge variant={getOrderStatusBadgeVariant(order.status)} className="h-5 px-2 text-[10px] uppercase tracking-wider">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xl">{order.subject || "Inget ämne"}</p>
                      </div>
                      <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1.5">
                        <div className="font-semibold text-lg text-foreground">{order.amount ? `${Number(order.amount).toLocaleString('sv-SE')} kr` : '-'}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(order.orderDate).toLocaleDateString('sv-SE')}
                        </div>
                        {order.campaignStart && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Kampanj: {order.campaignStart} → {order.campaignEnd ?? "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    {order.orderText && (
                      <div className="p-5 bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Orderbeskrivning
                          </h4>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium"
                            onClick={() => copyToClipboard(order.orderText || "")}>
                            <Copy className="h-3.5 w-3.5" /> Kopiera Text
                          </Button>
                        </div>
                        <div className="bg-secondary/20 p-5 rounded-md border border-border/40 text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground/90 overflow-x-auto">
                          {order.orderText}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-16 bg-card rounded-xl border border-dashed border-border/50">
                <Package className="h-10 w-10 text-muted mx-auto mb-4" />
                <p className="font-medium text-foreground text-base">Inga ordrar</p>
                <p className="text-sm text-muted-foreground mt-1">Kunden har inte gjort några beställningar ännu.</p>
              </div>
            )}
          </TabsContent>

          {/* ── Ärenden (todos) ───────────────────────────────────────────── */}
          <TabsContent value="todos" className="mt-0 outline-none">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Mersälj</CardTitle>
                  <CardDescription className="mt-1">Uppgifter kopplade till {customer.name}</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTodoOpen(true)} className="gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Nytt ärende
                </Button>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {todos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="h-10 w-10 text-muted mb-3" />
                    <p className="text-sm font-medium">Inga ärenden</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">Lägg till uppgifter du inte vill glömma för denna kund.</p>
                    <Button size="sm" className="mt-4" onClick={() => setTodoOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Lägg till ärende
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {todos.map(todo => {
                      const overdue = isOverdue(todo.dueDate) && !todo.done
                      return (
                        <li key={todo.id} className={cn(
                          "flex items-start gap-3 px-3 py-3 rounded-lg group transition-colors",
                          todo.done ? "opacity-60" : "hover:bg-secondary/50"
                        )}>
                          <button
                            onClick={() => handleToggleTodo(todo.id, todo.done)}
                            className={cn("mt-0.5 shrink-0 transition-colors", todo.done ? "text-primary hover:text-muted-foreground" : "text-muted-foreground hover:text-primary")}
                          >
                            {todo.done ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium leading-snug", todo.done && "line-through text-muted-foreground")}>
                              {todo.title}
                            </p>
                            {todo.dueDate && !todo.done && (
                              <div className={cn(
                                "flex items-center gap-1 mt-0.5 text-xs font-medium",
                                overdue ? "text-destructive" : "text-muted-foreground"
                              )}>
                                <CalendarClock className="h-3 w-3" />
                                {overdue ? "Förfallen " : "Förfaller "}{formatDate(todo.dueDate)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-0.5"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── E-mail ────────────────────────────────────────────────────── */}
          <TabsContent value="emails" className="mt-0 outline-none space-y-4">
            {emails && emails.length > 0 ? (
              emails.map(email => (
                <Card key={email.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
                  <CardHeader className="p-5 pb-3 bg-secondary/10 border-b border-border/30">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-base leading-tight">{email.subject}</CardTitle>
                        <CardDescription className="mt-1.5 font-medium">
                          Från: {email.fromName || email.fromEmail} <span className="text-muted-foreground/70 ml-1">&lt;{email.fromEmail}&gt;</span>
                        </CardDescription>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0 font-medium bg-card px-2 py-1 rounded-md border border-border/50">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(email.receivedAt).toLocaleDateString('sv-SE')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono text-[13px]">
                      {email.bodyText || <span className="text-muted-foreground italic font-sans">Inget textinnehåll</span>}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center p-16 bg-card rounded-xl border border-dashed border-border/50">
                <Mail className="h-10 w-10 text-muted mx-auto mb-4" />
                <p className="font-medium text-foreground text-base">Inga e-mail</p>
                <p className="text-sm text-muted-foreground mt-1">Inga kopplade e-mail hittades för denna kund.</p>
              </div>
            )}
          </TabsContent>

          {/* ── Tidslinje ─────────────────────────────────────────────────── */}
          <TabsContent value="timeline" className="mt-0 outline-none">
            <Card className="shadow-sm border-border/50">
              <CardHeader><CardTitle>Aktivitetshistorik</CardTitle></CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-8 pl-4 border-l-2 border-primary/20 relative ml-2 mt-4">
                  {timeline && timeline.length > 0 ? (
                    timeline.map((event, index) => (
                      <div key={event.id} className="relative">
                        <div className={`absolute -left-[25px] top-1.5 h-3 w-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground/40'} ring-4 ring-card`}></div>
                        <div className="space-y-1.5 bg-secondary/30 p-3 rounded-lg border border-border/50">
                          <p className="text-sm font-medium text-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(event.occurredAt).toLocaleString('sv-SE')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Ingen historik tillgänglig.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Edit customer dialog ──────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera kund</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Namn *</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Kundnamn" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-post</label>
                <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="e@post.se" type="email" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon</label>
                <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="070-000 00 00" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Företag</label>
                <Input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Företagsnamn" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Adress</label>
                <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Gatuadress" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Postnummer</label>
                <Input value={editForm.postalCode} onChange={e => setEditForm(f => ({ ...f, postalCode: e.target.value }))} placeholder="123 45" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Stad</label>
                <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Stad" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Kategori</label>
                <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privat">Privat</SelectItem>
                    <SelectItem value="foretag">Företag</SelectItem>
                    <SelectItem value="grossist">Grossist</SelectItem>
                    <SelectItem value="ovrigt">Övrigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktiv">Aktiv</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="inaktiv">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Anteckningar</label>
                <Textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Interna anteckningar om kunden..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
            <Button onClick={saveEdit} disabled={!editForm.name.trim() || saving}>
              {saving ? "Sparar..." : "Spara ändringar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add todo dialog ───────────────────────────────────────────────── */}
      <Dialog open={todoOpen} onOpenChange={setTodoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nytt ärende — {customer.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Titel *</label>
            <Input
              placeholder="T.ex. Svara på Cecilias mejl om annonsen"
              value={todoTitle}
              onChange={e => setTodoTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateTodo()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTodoOpen(false)}>Avbryt</Button>
            <Button onClick={handleCreateTodo} disabled={!todoTitle.trim() || addingTodo}>
              {addingTodo ? "Sparar..." : "Skapa ärende"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
