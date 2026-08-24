import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useListEmails,
  useLinkEmailToCustomer,
  useDeleteEmail,
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Mail, Clock, CheckCircle2, UserPlus, FileText, Search, User, Trash2 } from "lucide-react"

type LinkIntent = { emailId: number; createOrder: boolean } | null

export default function Inbox() {
  const queryClient = useQueryClient()
  const [linkIntent, setLinkIntent] = useState<LinkIntent>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; subject: string } | null>(null)

  // Ett enda flöde — allt kommer från Postmark-webhooken, nyast överst
  const { data: emails, isLoading } = useListEmails()

  const { data: customers } = useListCustomers()

  const invalidateEmails = () =>
    queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() })

  const linkEmail = useLinkEmailToCustomer({
    mutation: {
      onSuccess: () => {
        invalidateEmails()
        closeDialog()
      },
    },
  })

  const deleteEmail = useDeleteEmail({
    mutation: {
      onSuccess: () => {
        invalidateEmails()
        setDeleteTarget(null)
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
        <h1 className="text-3xl font-bold tracking-tight">Ordermejl</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Orderbekräftelser som kommit in via mejl. Med PDF skapas kund och order automatiskt —
          resten hanterar du här.
        </p>
      </div>

      {/* Email list — ett flöde, nyast överst */}
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
                    <div className="bg-emerald-500/10 p-4 rounded-lg text-sm text-center border border-emerald-500/20 flex-1 md:flex-none">
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

                  <button
                    onClick={() => setDeleteTarget({ id: email.id, subject: email.subject || "Utan ämne" })}
                    className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Radera
                  </button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-16 text-center border border-dashed border-border rounded-2xl bg-card/50">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="font-semibold text-foreground">Inga ordermejl ännu</p>
            <p className="text-sm text-muted-foreground mt-1">
              Mejl som BCC:as till din Postmark-adress dyker upp här automatiskt.
            </p>
          </div>
        )}
      </div>

      {/* Radera-dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Radera mejlet?</DialogTitle>
            <DialogDescription>
              "{deleteTarget?.subject}" tas bort permanent. Ordrar som skapats från mejlet
              påverkas inte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteEmail.isPending}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteEmail.mutate({ id: deleteTarget.id })}
              disabled={deleteEmail.isPending}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteEmail.isPending ? "Raderar…" : "Radera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Koppla till kund-dialog */}
      <Dialog open={linkIntent !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {linkIntent?.createOrder ? "Skapa order från mejl" : "Koppla mejl till kund"}
            </DialogTitle>
            <DialogDescription>
              Välj vilken kund mejlet hör till{linkIntent?.createOrder ? " — en order skapas samtidigt." : "."}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök på namn, e-post eller företag…"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ingen kund matchar sökningen.</p>
            ) : (
              filteredCustomers.slice(0, 50).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    selectedCustomerId === c.id
                      ? "bg-primary/10 border border-primary/40"
                      : "hover:bg-secondary border border-transparent"
                  }`}
                >
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{c.name}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {c.email || c.company || "—"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={linkEmail.isPending}>
              Avbryt
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCustomerId === null || linkEmail.isPending}
            >
              {linkEmail.isPending ? "Sparar…" : linkIntent?.createOrder ? "Koppla & skapa order" : "Koppla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
