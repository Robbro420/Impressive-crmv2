import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CalendarDays, Pencil, Target } from "lucide-react"

/**
 * Försäljningsmålkort på dashboarden — samma design som korten på Mål-sidan,
 * men med LIVE-omsättning och målet redigerbart direkt på kortet.
 */
export function SalesGoalCard({
  periodLabel,
  title,
  current,
  target,
  subtitle,
  onSaveTarget,
  saving,
}: {
  periodLabel: string
  title: string
  current: number
  target: number | null
  subtitle?: React.ReactNode
  onSaveTarget: (target: number) => void
  saving?: boolean
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState("")

  const percentage = target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : null
  const isCompleted = percentage !== null && percentage >= 100

  const openEdit = () => {
    setDraft(target ? String(target) : "")
    setEditOpen(true)
  }

  const save = () => {
    const value = parseInt(draft.replace(/[^\d]/g, ""), 10)
    if (!value || value <= 0) return
    onSaveTarget(value)
    setEditOpen(false)
  }

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isCompleted ? "border-emerald-300" : ""}`}>
      {isCompleted && (
        <div className="absolute top-0 right-0 py-1 px-4 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl gradient-success">
          Uppnått ✓
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-widest">{periodLabel}</span>
          </div>
          <button
            onClick={openEdit}
            title="Ställ in mål"
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors ${isCompleted ? "mr-16" : ""}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <CardTitle className="text-xl font-black">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between items-end mb-4">
          <div className="text-3xl font-black tracking-tight">
            {current.toLocaleString("sv-SE")} kr
          </div>
          <div className="text-sm text-muted-foreground font-semibold mb-0.5">
            {target ? `av ${target.toLocaleString("sv-SE")} kr` : "inget mål satt"}
          </div>
        </div>

        {target ? (
          <>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isCompleted ? "gradient-success" : "gradient-bg"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-xs">
              <span className="text-muted-foreground font-semibold">{subtitle ?? (percentage === 0 ? "Inte startat" : "Pågår")}</span>
              <span className={`font-black ${isCompleted ? "text-emerald-600" : "gradient-text"}`}>{percentage}%</span>
            </div>
          </>
        ) : (
          <button
            onClick={openEdit}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Target className="h-4 w-4" />
            Sätt mål
          </button>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{title} — mål</DialogTitle>
            <DialogDescription>Ange målet i kronor (exkl. moms).</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="t.ex. 150000"
              autoFocus
              className="pr-10 text-lg font-bold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">kr</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
            <Button onClick={save} disabled={saving || !draft.trim()}>
              {saving ? "Sparar…" : "Spara mål"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
