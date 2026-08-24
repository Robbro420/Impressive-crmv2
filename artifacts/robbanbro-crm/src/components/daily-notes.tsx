import { useState, useEffect, useRef, useCallback } from "react"
import { NotebookPen, ChevronDown, ChevronUp, Maximize2, Minimize2, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

/**
 * Dagligt noteringsblock på dashboarden.
 * Sparar per dag i den interna kalendern (samma data som kalendern i menyn),
 * autosparar medan man skriver, och kan fällas ihop / förstoras.
 */

type Mode = "collapsed" | "normal" | "large"
const MODE_KEY = "dailyNotesMode"

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
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem(MODE_KEY)
    return saved === "collapsed" || saved === "large" ? saved : "normal"
  })
  const [content, setContent] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const date = todayYMD()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestContent = useRef("")
  const lastSavedContent = useRef("")

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode)
  }, [mode])

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

  const collapsed = mode === "collapsed"
  const large = mode === "large"

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setMode(collapsed ? "normal" : "collapsed")}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <NotebookPen className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Dagens anteckningar</p>
          <p className="text-xs text-muted-foreground capitalize">{todayLabel()}</p>
        </div>
        {collapsed && content.trim() && (
          <span className="hidden sm:block max-w-[45%] truncate text-xs text-muted-foreground italic">
            {content.trim().split("\n")[0]}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saved && !saving && <Check className="h-3.5 w-3.5 text-emerald-600" />}
          {!collapsed && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                setMode(large ? "normal" : "large")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  setMode(large ? "normal" : "large")
                }
              }}
              className="p-1 rounded hover:bg-secondary hover:text-foreground"
              title={large ? "Förminska" : "Förstora"}
            >
              {large ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </span>
          )}
          <span className="p-1" title={collapsed ? "Fäll ut" : "Fäll ihop"}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-border px-5 py-4">
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={persist}
            disabled={!loaded}
            placeholder={loaded ? "Att göra idag, saker att komma ihåg…" : "Laddar…"}
            className={cn(
              "w-full resize-none rounded-lg border border-input bg-background px-3.5 py-3 text-sm leading-relaxed outline-none transition-[height] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15",
              large ? "h-[55vh]" : "h-36",
            )}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Sparas automatiskt · en anteckning per dag · äldre dagar hittar du i kalendern i menyn
          </p>
        </div>
      )}
    </div>
  )
}
