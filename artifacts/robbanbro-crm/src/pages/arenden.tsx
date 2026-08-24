import { useState } from "react"
import {
  useListCases,
  useCreateCase,
  useUpdateCase,
  useDeleteCase,
  useListCustomers,
  getListCasesQueryKey,
} from "@workspace/api-client-react"
import type { Case } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Trash2, FolderOpen, Loader2, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUSES = ["öppet", "pågående", "löst"] as const
type CaseStatus = (typeof STATUSES)[number]

function statusBadgeClass(status: string) {
  switch (status) {
    case "öppet": return "bg-blue-100 text-blue-700 border-blue-200"
    case "pågående": return "bg-amber-100 text-amber-700 border-amber-200"
    case "löst": return "bg-emerald-100 text-emerald-700 border-emerald-200"
    default: return ""
  }
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

const NONE_CUSTOMER = "__none__"

interface CaseFormState {
  title: string
  description: string
  status: CaseStatus
  customerId: string
}

const emptyForm = (): CaseFormState => ({ title: "", description: "", status: "öppet", customerId: NONE_CUSTOMER })

export default function Arenden() {
  const queryClient = useQueryClient()
  const [, setLocation] = useLocation()
  const { data: cases = [], isLoading } = useListCases()
  const { data: customers = [] } = useListCustomers()
  const createMutation = useCreateCase()
  const updateMutation = useUpdateCase()
  const deleteMutation = useDeleteCase()

  const [filter, setFilter] = useState<string>("alla")
  const [createOpen, setCreateOpen] = useState(false)
  const [editCase, setEditCase] = useState<Case | null>(null)
  const [form, setForm] = useState<CaseFormState>(emptyForm())
  const [busy, setBusy] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCasesQueryKey() })

  const openCreate = () => { setForm(emptyForm()); setCreateOpen(true) }
  const openEdit = (c: Case) => {
    setEditCase(c)
    setForm({
      title: c.title,
      description: c.description ?? "",
      status: (STATUSES as readonly string[]).includes(c.status) ? (c.status as CaseStatus) : "öppet",
      customerId: c.customerId != null ? String(c.customerId) : NONE_CUSTOMER,
    })
  }

  const payloadFromForm = () => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    customerId: form.customerId !== NONE_CUSTOMER ? parseInt(form.customerId, 10) : undefined,
  })

  const handleCreate = () => {
    if (!form.title.trim()) return
    setBusy(true)
    createMutation.mutate({ data: payloadFromForm() }, {
      onSuccess: () => { invalidate(); setCreateOpen(false); setBusy(false) },
      onError: () => setBusy(false),
    })
  }

  const handleSave = () => {
    if (!editCase || !form.title.trim()) return
    setBusy(true)
    updateMutation.mutate({
      id: editCase.id,
      data: {
        ...payloadFromForm(),
        description: form.description.trim() || null,
        customerId: form.customerId !== NONE_CUSTOMER ? parseInt(form.customerId, 10) : null,
      },
    }, {
      onSuccess: () => { invalidate(); setEditCase(null); setBusy(false) },
      onError: () => setBusy(false),
    })
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteMutation.mutate({ id }, { onSuccess: invalidate })
  }

  const setStatus = (e: React.MouseEvent, c: Case, status: CaseStatus) => {
    e.stopPropagation()
    updateMutation.mutate({ id: c.id, data: { status } }, { onSuccess: invalidate })
  }

  const filtered = filter === "alla" ? cases : cases.filter((c) => c.status === filter)
  const counts = Object.fromEntries(STATUSES.map((s) => [s, cases.filter((c) => c.status === s).length]))

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Titel *</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Vad gäller ärendet?" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Beskrivning</label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CaseStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Kund</label>
          <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
            <SelectTrigger><SelectValue placeholder="Ingen kund" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CUSTOMER}>Ingen kund</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ärenden</h1>
          <p className="text-muted-foreground mt-1">Kundärenden och pågående frågor</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nytt ärende</Button>
      </div>

      {/* Statusfilter */}
      <div className="flex gap-2">
        {(["alla", ...STATUSES] as string[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
              filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground hover:border-primary/40"
            )}
          >
            {s}{s !== "alla" && ` (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> {filter === "alla" ? "Alla ärenden" : `Ärenden: ${filter}`}
          </CardTitle>
          <CardDescription>{filtered.length} st</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Inga ärenden här ännu.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  onClick={() => openEdit(c)}
                  className="flex items-start gap-3 px-2 py-3 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group"
                >
                  <Badge variant="outline" className={cn("mt-0.5 shrink-0 capitalize", statusBadgeClass(c.status))}>
                    {c.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{c.title}</p>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {c.customerName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (c.customerId) setLocation(`/customers/${c.customerId}`) }}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <User className="h-3 w-3" />{c.customerName}
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{formatDate(c.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.status !== "löst" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => setStatus(e, c, c.status === "öppet" ? "pågående" : "löst")}>
                        {c.status === "öppet" ? "Starta" : "Markera löst"}
                      </Button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, c.id)}
                      className="p-1.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Skapa */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nytt ärende</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Avbryt</Button>
            <Button onClick={handleCreate} disabled={busy || !form.title.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Skapa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redigera */}
      <Dialog open={!!editCase} onOpenChange={(o) => !o && setEditCase(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera ärende</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCase(null)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={busy || !form.title.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
