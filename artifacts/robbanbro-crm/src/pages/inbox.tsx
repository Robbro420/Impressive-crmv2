import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useListEmails,
  useLinkEmailToCustomer,
  useListCustomers,
  getListEmailsQueryKey,
} from "@workspace/api-client-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Mail, Clock, CheckCircle2, UserPlus, FileText, Search, User } from "lucide-react"

type LinkIntent = { emailId: number; createOrder: boolean } | null

export default function Inbox() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"unprocessed" | "processed">("unprocessed")
  const [linkIntent, setLinkIntent] = useState<LinkIntent>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  const { data: emails, isLoading } = useListEmails({
    processed: activeTab === "processed",
  })

  const { data: customers } = useListCustomers()

  const linkEmail = useLinkEmailToCustomer({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey({ processed: false }) })
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey({ processed: true }) })
        closeDialog()
      },
    },
  })

  const openDialog = (emailId: number, createOrder: boolean) => {
    setLinkIntent({ emailId, createOrder })
    setCustomerSearch("")
    setSelectedCustomerId(null)
  }

  const closeDialog = () => {
    setLinkIntent(null)
    setCustomerSearch("")
    setSelectedCustomerId(null)
  }

  const handleConfirm = () => {
    if (!linkIntent || selectedCustomerId === null) return
    linkEmail.mutate({
      id: linkIntent.emailId,
      data: { customerId: selectedCustomerId, createOrder: linkIntent.createOrder },
    })
  }

  const filteredCustomers = customers?.filter((c) => {
    const q = customerSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    )
  }) ?? []

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inkorg</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Hantera inkommande e-post och skapa ordrar automatiskt.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/50">
        {(["unprocessed", "processed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "unprocessed" ? "Obehandlade" : "Behandlade"}
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse shadow-sm border-border/50">
              <div className="p-6">
                <div className="h-5 w-1/3 bg-muted rounded mb-4" />
                <div className="h-20 w-full bg-muted rounded" />
              </div>
            </Card>
          ))
        ) : emails && emails.length > 0 ? (
          emails.map((email) => (
            <Card key={email.id} className="shadow-sm border-border/50 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row gap-6 justify-between">
                {/* Left: email content */}
                <div className="space-y-4 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-foreground">
                        {email.subject || "Utan ämne"}
                      </h3>
                      {!email.processed && (
                        <Badge variant="info" className="bg-primary/10 text-primary hover:bg-primary/20">
                          Ny
                        </Badge>
                      )}
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(email.receivedAt).toLocaleString("sv-SE")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {email.fromName
                      ? `${email.fromName} (${email.fromEmail})`
                      : email.fromEmail}
                  </div>

                  <div className="bg-secondary/20 p-4 rounded-md border border-border/40 text-[13px] text-foreground/80 font-mono line-clamp-3 leading-relaxed">
                    {email.bodyText || (
                      <span className="italic font-sans text-muted-foreground">
                        Inget textinnehåll.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-48 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-border/50 md:pl-6 mt-2 md:mt-0">
                  {email.processed ? (
                    <div className="bg-emerald-500/10 p-4 rounded-lg text-sm text-center border border-emerald-500/20">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                      <span className="font-medium text-emerald-800 dark:text-emerald-400">
                        Behandlad
                      </span>
                      {email.customerName && (
                        <div className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1 truncate px-2">
                          Kopplad till: <br />
                          <span className="font-semibold">{email.customerName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 w-full">
                      <Button
                        variant="default"
                        className="w-full justify-start shadow-sm"
                        onClick={() => openDialog(email.id, true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Skapa Order
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start bg-background"
                        onClick={() => openDialog(email.id, false)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Koppla till kund
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center p-16 bg-card rounded-xl border border-dashed border-border/50">
            <Mail className="h-10 w-10 text-muted mx-auto mb-4" />
            <p className="font-medium text-foreground text-base">Inga e-mail</p>
            <p className="text-sm text-muted-foreground mt-1">
              Du har inga{" "}
              {activeTab === "unprocessed" ? "obehandlade" : "behandlade"} e-mail i
              inkorgen.
            </p>
          </div>
        )}
      </div>

      {/* Link / Create Order dialog */}
      <Dialog open={!!linkIntent} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkIntent?.createOrder ? "Skapa order från e-mail" : "Koppla till kund"}
            </DialogTitle>
            <DialogDescription>
              {linkIntent?.createOrder
                ? "Välj kund — en ny order skapas med mejlets text som ordertext."
                : "Välj kund att koppla mejlet till utan att skapa order."}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök kund…"
              className="pl-9"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Customer list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Inga kunder hittades.
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    selectedCustomerId === c.id ? "bg-primary/10 font-semibold" : ""
                  }`}
                  onClick={() => setSelectedCustomerId(c.id)}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    selectedCustomerId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm truncate">{c.name}</p>
                    {c.company && (
                      <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                    )}
                  </div>
                  {selectedCustomerId === c.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeDialog}>
              Avbryt
            </Button>
            <Button
              disabled={selectedCustomerId === null || linkEmail.isPending}
              onClick={handleConfirm}
            >
              {linkEmail.isPending
                ? "Sparar…"
                : linkIntent?.createOrder
                ? "Skapa order"
                : "Koppla"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
