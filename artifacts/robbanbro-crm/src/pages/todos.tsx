import { useState, useEffect } from "react"
import {
  useListTodos,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
} from "@workspace/api-client-react"
import type { Todo } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CalendarClock,
  ClipboardList,
  AlertCircle,
  CalendarPlus,
  Mail,
  Phone,
  User,
  ChevronRight,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

function formatDate(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })
}

function isOverdue(iso: string | null | undefined) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

function buildGoogleCalendarUrl(todo: { title: string; description?: string | null; dueDate?: string | null; notifyEmails?: string | null }) {
  if (!todo.dueDate) return null
  const start = new Date(todo.dueDate)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: todo.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: todo.description ?? "",
  })
  todo.notifyEmails?.split(",").map(e => e.trim()).filter(Boolean).forEach(email => params.append("add", email))
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildEmailBody(todo: Todo): string {
  const lines: string[] = [
    `Ärende: ${todo.title}`,
  ]
  if (todo.description) {
    lines.push("", todo.description)
  }
  if (todo.contactName || todo.contactPhone || todo.contactEmail) {
    lines.push("", "Kontaktperson:")
    if (todo.contactName) lines.push(`  Namn: ${todo.contactName}`)
    if (todo.contactPhone) lines.push(`  Telefon: ${todo.contactPhone}`)
    if (todo.contactEmail) lines.push(`  E-post: ${todo.contactEmail}`)
  }
  if (todo.dueDate) {
    lines.push("", `Förfallodatum: ${formatDate(todo.dueDate)}`)
  }
  return lines.join("\n")
}

// ── Shared form fields ─────────────────────────────────────────────────────

interface TodoFormState {
  title: string
  description: string
  dueDate: string
  contactName: string
  contactPhone: string
  contactEmail: string
  notifyEmails: string
}

function emptyForm(): TodoFormState {
  return { title: "", description: "", dueDate: "", contactName: "", contactPhone: "", contactEmail: "", notifyEmails: "" }
}

function todoToForm(t: Todo): TodoFormState {
  return {
    title: t.title,
    description: t.description ?? "",
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
    contactName: t.contactName ?? "",
    contactPhone: t.contactPhone ?? "",
    contactEmail: t.contactEmail ?? "",
    notifyEmails: t.notifyEmails ?? "",
  }
}

interface TodoFormFieldsProps {
  form: TodoFormState
  onChange: (f: TodoFormState) => void
}

function TodoFormFields({ form, onChange }: TodoFormFieldsProps) {
  const set = (key: keyof TodoFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value })

  return (
    <div className="space-y-4 py-2">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Titel *</label>
        <Input
          placeholder="T.ex. Svara på Cecilias mejl om annonsen"
          value={form.title}
          onChange={set("title")}
          autoFocus
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">Vad gäller det?</label>
        <Textarea
          placeholder="Beskriv vad som ska göras, bakgrund, detaljer..."
          value={form.description}
          onChange={set("description")}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kontaktperson</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" /> Namn
            </label>
            <Input
              placeholder="Cecilia Nielsen"
              value={form.contactName}
              onChange={set("contactName")}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" /> Telefon
            </label>
            <Input
              placeholder="070-000 00 00"
              value={form.contactPhone}
              onChange={set("contactPhone")}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3" /> E-post
          </label>
          <Input
            placeholder="cecilia@kund.se"
            value={form.contactEmail}
            onChange={set("contactEmail")}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 block">
            <CalendarClock className="h-3.5 w-3.5" /> Förfallodatum
          </label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={set("dueDate")}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 block">
            <CalendarPlus className="h-3.5 w-3.5" /> Bjud in (Google Kal.)
          </label>
          <Input
            placeholder="robert@robbanbro.se"
            value={form.notifyEmails}
            onChange={set("notifyEmails")}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Kommaseparerade e-postadresser för kalenderinbjudan.
      </p>
    </div>
  )
}

// ── Send-email dialog ──────────────────────────────────────────────────────

interface SendEmailDialogProps {
  todo: Todo | null
  onClose: () => void
}

function SendEmailDialog({ todo, onClose }: SendEmailDialogProps) {
  const { user } = useAuth()
  const [to, setTo] = useState(() => user?.colleagueEmail ?? "")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const isOpen = !!todo

  // Reset and populate fields whenever the selected todo changes
  useEffect(() => {
    if (!todo) return
    setTo(user?.colleagueEmail ?? "")
    setSubject(`Ärende: ${todo.title}`)
    setBody(buildEmailBody(todo))
    setSent(false)
    setError(null)
  }, [todo?.id])

  const handleSend = async () => {
    if (!todo || !to.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""
      const res = await fetch(`${BASE}/api/todos/${todo.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      // Save the recipient as the default colleague email for next time
      localStorage.setItem("colleague_email", to.trim())
      setSent(true)
      setTimeout(() => {
        onClose()
        setSent(false)
      }, 1500)
    } catch (e: any) {
      setError(e.message ?? "Kunde inte skicka mejlet")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Skicka ärende via mejl
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Till</label>
            <Input
              type="email"
              placeholder="kollega@robbanbro.se"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ämne</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Meddelande</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="resize-none font-mono text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Avbryt</Button>
          <Button
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || !body.trim() || sending || sent}
          >
            {sent ? "Skickat ✓" : sending ? "Skickar..." : (
              <><Send className="h-4 w-4 mr-1.5" />Skicka mejl</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Todos() {
  const queryClient = useQueryClient()
  const { data: todos = [], isLoading } = useListTodos()
  const createMutation = useCreateTodo()
  const updateMutation = useUpdateTodo()
  const deleteMutation = useDeleteTodo()

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<TodoFormState>(emptyForm())
  const [creating, setCreating] = useState(false)

  // Edit dialog
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [editForm, setEditForm] = useState<TodoFormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  // Send-email dialog
  const [emailTodo, setEmailTodo] = useState<Todo | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listTodos"] })

  const openEdit = (todo: Todo) => {
    setEditTodo(todo)
    setEditForm(todoToForm(todo))
  }

  const handleToggle = (e: React.MouseEvent, id: number, done: boolean) => {
    e.stopPropagation()
    updateMutation.mutate({ id, data: { done: !done } }, { onSuccess: invalidate })
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteMutation.mutate({ id }, { onSuccess: invalidate })
  }

  const handleCreate = () => {
    if (!createForm.title.trim()) return
    setCreating(true)
    createMutation.mutate(
      {
        data: {
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
          dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : undefined,
          contactName: createForm.contactName.trim() || undefined,
          contactPhone: createForm.contactPhone.trim() || undefined,
          contactEmail: createForm.contactEmail.trim() || undefined,
          notifyEmails: createForm.notifyEmails.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidate()
          setCreateForm(emptyForm())
          setCreateOpen(false)
          setCreating(false)
        },
        onError: () => setCreating(false),
      }
    )
  }

  const handleSaveEdit = () => {
    if (!editTodo || !editForm.title.trim()) return
    setSaving(true)
    updateMutation.mutate(
      {
        id: editTodo.id,
        data: {
          title: editForm.title.trim(),
          description: editForm.description.trim() || undefined,
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
          contactName: editForm.contactName.trim() || undefined,
          contactPhone: editForm.contactPhone.trim() || undefined,
          contactEmail: editForm.contactEmail.trim() || undefined,
          notifyEmails: editForm.notifyEmails.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidate()
          setEditTodo(null)
          setSaving(false)
        },
        onError: () => setSaving(false),
      }
    )
  }

  const pending = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)
  const overdue = pending.filter((t) => isOverdue(t.dueDate))

  const TodoRow = ({ todo, dimmed = false }: { todo: Todo; dimmed?: boolean }) => {
    const overdueTodo = isOverdue(todo.dueDate)
    const calUrl = buildGoogleCalendarUrl(todo)
    return (
      <li
        key={todo.id}
        onClick={() => openEdit(todo)}
        className={cn(
          "flex items-start gap-3 px-3 py-3 rounded-lg transition-colors group cursor-pointer",
          dimmed ? "hover:bg-secondary/30" : "hover:bg-secondary/50"
        )}
      >
        <button
          onClick={(e) => handleToggle(e, todo.id, todo.done)}
          className={cn(
            "mt-0.5 shrink-0 transition-colors",
            todo.done ? "text-primary hover:text-muted-foreground" : "text-muted-foreground hover:text-primary"
          )}
        >
          {todo.done ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-snug", dimmed && "line-through text-muted-foreground")}>
            {todo.title}
          </p>
          {todo.description && (
            <p className={cn("text-xs mt-0.5 line-clamp-1", dimmed ? "text-muted-foreground/60 line-through" : "text-muted-foreground")}>
              {todo.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {todo.contactName && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{todo.contactName}
              </span>
            )}
            {todo.contactPhone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />{todo.contactPhone}
              </span>
            )}
            {todo.contactEmail && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />{todo.contactEmail}
              </span>
            )}
            {todo.dueDate && (
              <span className={cn("text-xs flex items-center gap-1 font-medium", overdueTodo ? "text-destructive" : "text-muted-foreground")}>
                <CalendarClock className="h-3 w-3" />
                {overdueTodo ? "Förfallen " : ""}{formatDate(todo.dueDate)}
                {overdueTodo && <Badge variant="destructive" className="ml-0.5 text-[10px] py-0 h-4">!</Badge>}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); setEmailTodo(todo) }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            title="Skicka ärende via mejl"
          >
            <Send className="h-4 w-4" />
          </button>
          {calUrl && (
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Lägg till i Google Kalender"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            >
              <CalendarPlus className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={(e) => handleDelete(e, todo.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            title="Ta bort"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mersälj</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {pending.length} öppna uppföljningar
            {overdue.length > 0 && (
              <span className="ml-2 text-destructive font-medium">· {overdue.length} förfallna</span>
            )}
          </p>
        </div>
        <Button onClick={() => { setCreateForm(emptyForm()); setCreateOpen(true) }} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Nytt ärende
        </Button>
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Du har {overdue.length} förfallet ärende{overdue.length > 1 ? "n" : ""} som behöver åtgärdas.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <Card className="shadow-sm border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-muted mb-4" />
            <p className="font-medium text-lg">Inga ärenden</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Lägg till saker du inte vill glömma — svar på mejl, uppgifter att skapa, vad som helst.
            </p>
            <Button className="mt-6 shadow-sm" onClick={() => { setCreateForm(emptyForm()); setCreateOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Skapa första ärendet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Öppna ({pending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <ul className="divide-y divide-border/50">
                  {pending.map((todo) => <TodoRow key={todo.id} todo={todo} />)}
                </ul>
              </CardContent>
            </Card>
          )}

          {done.length > 0 && (
            <Card className="shadow-sm border-border/40 opacity-70">
              <CardHeader className="pb-2 pt-5 px-5">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Klara ({done.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <ul className="divide-y divide-border/30">
                  {done.map((todo) => <TodoRow key={todo.id} todo={todo} dimmed />)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nytt ärende</DialogTitle>
          </DialogHeader>
          <TodoFormFields form={createForm} onChange={setCreateForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Avbryt</Button>
            <Button onClick={handleCreate} disabled={!createForm.title.trim() || creating}>
              {creating ? "Sparar..." : "Skapa ärende"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editTodo} onOpenChange={(open) => !open && setEditTodo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Redigera ärende</DialogTitle>
          </DialogHeader>
          <TodoFormFields form={editForm} onChange={setEditForm} />
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive mr-auto"
              onClick={(e) => {
                if (editTodo) handleDelete(e as unknown as React.MouseEvent, editTodo.id)
                setEditTodo(null)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Ta bort
            </Button>
            <Button variant="outline" onClick={() => setEditTodo(null)}>Avbryt</Button>
            <Button onClick={handleSaveEdit} disabled={!editForm.title.trim() || saving}>
              {saving ? "Sparar..." : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send-email dialog ── */}
      <SendEmailDialog todo={emailTodo} onClose={() => setEmailTodo(null)} />
    </div>
  )
}
