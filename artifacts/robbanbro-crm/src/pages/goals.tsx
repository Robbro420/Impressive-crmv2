import { useListGoals } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Plus, TrendingUp, CalendarDays } from "lucide-react"

export default function Goals() {
  const { data: goals, isLoading } = useListGoals()

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'orders': return 'Ordrar'
      case 'revenue': return 'Omsättning'
      case 'new_customers': return 'Nya kunder'
      default: return metric
    }
  }

  const formatValue = (metric: string, value: number) => {
    if (metric === 'revenue') return `${value.toLocaleString('sv-SE')} kr`
    return `${value} st`
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Mål & Uppföljning</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Följ upp företagets prestation mot uppsatta mål.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nytt Mål
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({length: 3}).map((_, i) => (
            <Card key={i} className="animate-pulse h-56">
               <CardHeader className="pb-2"><div className="h-5 w-1/2 bg-muted rounded"></div></CardHeader>
               <CardContent><div className="h-2 w-full bg-muted rounded mt-12"></div></CardContent>
            </Card>
          ))
        ) : goals && goals.length > 0 ? (
          goals.map(goal => {
            const current = goal.current || 0
            const percentage = Math.min(100, Math.round((current / goal.target) * 100))
            const isCompleted = percentage >= 100
            
            return (
              <Card key={goal.id} className={`relative overflow-hidden transition-all hover:shadow-lg ${isCompleted ? 'border-emerald-300' : ''}`}>
                {isCompleted && (
                  <div className="absolute top-0 right-0 py-1 px-4 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl" style={{background: "hsl(var(--success))"}}>Uppnått ✓</div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-bold uppercase tracking-widest">{
                      goal.period === 'weekly' ? 'Veckomål' : 
                      goal.period === 'monthly' ? 'Månadsmål' : 'Kvartalsmål'
                    }</span>
                  </div>
                  <CardTitle className="text-xl font-black">{goal.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1 text-sm font-semibold">
                    <TrendingUp className="h-3.5 w-3.5" style={{color: "hsl(var(--primary))"}} />
                    Mäter: {getMetricLabel(goal.metric)}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex justify-between items-end mb-4">
                    <div className="text-3xl font-black tracking-tight">
                      {formatValue(goal.metric, current)}
                    </div>
                    <div className="text-sm text-muted-foreground font-semibold mb-0.5">
                      av {formatValue(goal.metric, goal.target)}
                    </div>
                  </div>

                  {/* Gradient progress bar */}
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${percentage}%`,
                        background: isCompleted
                          ? 'hsl(var(--success))'
                          : 'hsl(var(--primary))',
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2 text-xs font-bold">
                    <span className="text-muted-foreground font-semibold">{percentage === 0 ? 'Inte startat' : 'Pågår'}</span>
                    <span style={{
                      background: isCompleted
                        ? 'hsl(var(--success))'
                        : 'hsl(var(--primary))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>{percentage}%</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center p-16 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{background: "hsl(var(--primary) / 0.1)"}}>
              <Target className="h-8 w-8" style={{color: "hsl(var(--primary))"}} />
            </div>
            <p className="font-black text-foreground text-xl">Inga mål uppsatta</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">Skapa ditt första mål för att börja mäta företagets prestation och motivera teamet.</p>
            <Button className="mt-6">Skapa första målet</Button>
          </div>
        )}
      </div>
    </div>
  )
}
