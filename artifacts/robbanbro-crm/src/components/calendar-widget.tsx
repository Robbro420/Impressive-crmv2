import { useState, useEffect, useRef, useCallback } from "react"
import { CalendarDays, X, ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

interface CalendarEntry {
  id: number
  date: string
  content: string
}

function getBaseUrl() {
  return (import.meta.env.BASE_URL as string).replace(/\/$/, "")
}

async function fetchEntries(from: string, to: string): Promise<CalendarEntry[]> {
  const res = await fetch(`${getBaseUrl()}/api/calendar?from=${from}&to=${to}`, {
    credentials: "include",
  })
  if (!res.ok) return []
  return res.json()
}

async function upsertEntry(date: string, content: string): Promise<CalendarEntry | null> {
  const res = await fetch(`${getBaseUrl()}/api/calendar/${date}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) return null
  return res.json()
}

// YYYY-MM-DD helpers
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}
function firstOfMonth(y: number, m: number) {
  return new Date(y, m, 1)
}
function lastOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0)
}

const MONTHS = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"]
const WEEKDAYS = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"]

export function CalendarWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const today = new Date()

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(today))
  const [entries, setEntries] = useState<Map<string, CalendarEntry>>(new Map())
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  // Load entries when month or open changes
  useEffect(() => {
    if (!open || !user) return
    const from = toYMD(firstOfMonth(viewYear, viewMonth))
    const to = toYMD(lastOfMonth(viewYear, viewMonth))
    setLoading(true)
    fetchEntries(from, to).then((rows) => {
      const map = new Map<string, CalendarEntry>()
      rows.forEach((r) => map.set(r.date, r))
      setEntries(map)
      // Update draft for currently selected date if visible
      const cur = entries.get(selectedDate)
      setDraft(cur?.content ?? "")
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, viewYear, viewMonth, user])

  // Update draft when selected date changes
  useEffect(() => {
    const entry = entries.get(selectedDate)
    setDraft(entry?.content ?? "")
    setSaved(false)
  }, [selectedDate, entries])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the toggle button itself (handled by toggle)
        const btn = document.getElementById("cal-toggle-btn")
        if (btn?.contains(e.target as Node)) return
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const result = await upsertEntry(selectedDate, draft)
    setSaving(false)
    setSaved(true)
    setEntries((prev) => {
      const next = new Map(prev)
      if (result && result.id) next.set(selectedDate, result)
      else next.delete(selectedDate)
      return next
    })
    setTimeout(() => setSaved(false), 2000)
  }, [selectedDate, draft])

  // Calendar grid
  const firstDay = firstOfMonth(viewYear, viewMonth)
  const lastDay = lastOfMonth(viewYear, viewMonth)
  // Mon=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const todayStr = toYMD(today)
  const selectedEntry = entries.get(selectedDate)
  const hasChanges = draft !== (selectedEntry?.content ?? "")

  const formatSelectedDate = () => {
    const d = new Date(selectedDate + "T12:00:00")
    return d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" })
  }

  return (
    <>
      {/* ── Toggle button in sidebar ── */}
      <button
        id="cal-toggle-btn"
        onClick={() => setOpen((o) => !o)}
        title="Kalender & loggbok"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer w-full group"
        style={open
          ? { background: "hsl(var(--primary))", color: "#fff", boxShadow: "0 1px 3px rgba(20,20,43,0.12)" }
          : { color: "hsl(var(--muted-foreground))" }
        }
      >
        <CalendarDays className="h-4 w-4 shrink-0" style={{ color: open ? "#fff" : undefined }} />
        Kalender
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(2px)", zIndex: 39, transition: "opacity 0.2s",
        }} />
      )}

      {/* ── Slide-out panel ── */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : "-420px",
          width: 400,
          height: "100dvh",
          background: "#fff",
          boxShadow: "-4px 0 40px rgba(20,20,43,0.08)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          borderLeft: "1px solid rgba(20,20,43,0.06)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid #f1f0f0",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "hsl(var(--primary) / 0.04)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "hsl(var(--primary))",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <CalendarDays size={16} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Kalender & Loggbok</h2>
            <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Anteckna viktiga händelser</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#999" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Calendar */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f0f0" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#666" }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 14, color: "#111" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6, color: "#666" }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#aaa", padding: "2px 0", letterSpacing: "0.03em" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const hasEntry = entries.has(dateStr)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    position: "relative",
                    height: 34,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: isSelected || isToday ? 700 : 500,
                    fontSize: 13,
                    transition: "all 0.15s",
                    background: isSelected
                      ? "hsl(var(--primary))"
                      : isToday
                        ? "rgba(99,82,197,0.08)"
                        : "transparent",
                    color: isSelected ? "#fff" : isToday ? "hsl(var(--primary))" : "#333",
                    outline: isToday && !isSelected ? "1.5px solid rgba(20,20,43,0.12)" : "none",
                  }}
                >
                  {day}
                  {hasEntry && (
                    <span style={{
                      position: "absolute",
                      bottom: 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isSelected ? "rgba(255,255,255,0.8)" : "hsl(var(--primary))",
                      display: "block",
                    }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Log editor */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#333", flex: 1, textTransform: "capitalize" }}>
              {formatSelectedDate()}
            </span>
            {loading && <Loader2 size={14} style={{ color: "#aaa", animation: "spin 1s linear infinite" }} />}
          </div>
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
            placeholder={`Vad hände den här dagen?\n\nSkriv loggar, möten, beslut eller viktiga noteringar...`}
            style={{
              flex: 1,
              width: "100%",
              resize: "none",
              border: "1.5px solid",
              borderColor: draft ? "rgba(20,20,43,0.12)" : "#e5e7eb",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              color: "#222",
              outline: "none",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
              background: "#fafaf9",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(99,82,197,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,82,197,0.08)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = draft ? "rgba(20,20,43,0.12)" : "#e5e7eb"; e.currentTarget.style.boxShadow = "none" }}
          />

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 10,
                border: "none",
                background: saving || !hasChanges
                  ? "#f0f0f0"
                  : "hsl(var(--primary))",
                color: saving || !hasChanges ? "#aaa" : "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: saving || !hasChanges ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s",
                boxShadow: saving || !hasChanges ? "none" : "0 4px 14px rgba(20,20,43,0.12)",
                fontFamily: "inherit",
              }}
            >
              {saving
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sparar…</>
                : saved
                  ? "✓ Sparat!"
                  : <><Save size={14} /> Spara logg</>}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  )
}
