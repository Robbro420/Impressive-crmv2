import { useState, useEffect, useRef, useCallback } from "react"
import { NotebookPen, X, Loader2, Check } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

/**
 * Dagens anteckningar — flytande knapp nere till höger som öppnar en hög
 * sidopanel. Sparar per dag i den interna kalendern (calendar_logs) och
 * autosparar medan man skriver.
 */

function getBaseUrl() {
  return (import.meta.env.BASE_URL as string).replace(/\/$/, "")
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10)
}

const WEEKDAYS = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"]
const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"]

function todayLabel() {
  const d = new Date()
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function DailyNotes() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const date = todayYMD()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContent = useRef("")
  const lastSavedContent = useRef("")

  // Load today's note
  useEffect(() => {
    if (!user) return
    fetch(`${getBaseUrl()}/api/calendar?from=${date}&to=${date}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ date: string; content: string }>) => {
        const entry = rows.find((r) => r.date === date)
        const text = entry?.content ?? ""
        setContent(text)
        latestContent.current = text
        lastSavedContent.current = text
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [user, date])

  const persist = useCallback(async () => {
    const text = latestContent.current
    if (text === lastSavedContent.current) return
    setSaving(true)
    const res = await fetch(`${getBaseUrl()}/api/calendar/${date}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    }).catch(() => null)
    setSaving(false)
    if (res?.ok) {
      lastSavedContent.current = text
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }, [date])

  const handleChange = (text: string) => {
    setContent(text)
    latestContent.current = text
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(persist, 900)
  }

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      void persist()
    }
  }, [persist])

  const hasContent = content.trim().length > 0

  return (
    <>
      {/* Flytande knapp */}
      <button
        onClick={() => setOpen(true)}
        title="Dagens anteckningar"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-bg text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <NotebookPen className="h-6 w-6" />
        {hasContent && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#22d3ee] border-2 border-white" />
        )}
      </button>

      {/* Sidopanel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => { void persist(); setOpen(false) }}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-bg text-white shrink-0">
                <NotebookPen className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold leading-tight">Dagens anteckningar</p>
                <p className="text-xs text-muted-foreground capitalize">{todayLabel()}</p>
              </div>
              <span className="flex items-center gap-2 text-muted-foreground">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saved && !saving && <Check className="h-4 w-4 text-emerald-600" />}
                <button
                  onClick={() => { void persist(); setOpen(false) }}
                  className="p-1.5 rounded-lg hover:bg-secondary hover:text-foreground transition-colors"
                  title="Stäng"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </div>

            {/* Textarea — fyller hela höjden */}
            <textarea
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={persist}
              disabled={!loaded}
              autoFocus
              placeholder={loaded ? "Att göra idag, saker att komma ihåg…" : "Laddar…"}
              className="flex-1 w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
            />

            <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
              Sparas automatiskt · en anteckning per dag · äldre dagar hittar du i kalendern i menyn
            </p>
          </div>
        </>
      )}
    </>
  )
}
