import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Mail, HardDrive, FileSpreadsheet, Calendar, FileText, CheckCircle2, Circle, RefreshCw, Inbox } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useGetGmailStatus, useSyncGmail, getListEmailsQueryKey } from "@workspace/api-client-react"

const services = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Hämta inkommande mejl direkt till CRM:ets inkorg och koppla dem till kunder.",
    icon: Mail,
    color: "linear-gradient(135deg,#ea4335,#fbbc04)",
    features: ["Hämta mejl från inkorgen", "Auto-koppling till kunder via avsändare", "Mejlhistorik på kundkortet"],
  },
  {
    id: "drive",
    name: "Google Drive",
    description: "Bifoga och visa filer direkt på kundkort och ordrar.",
    icon: HardDrive,
    color: "linear-gradient(135deg,#1fa463,#34a853)",
    features: ["Bifoga Drive-filer till kunder", "Visa delade dokument på ordrar", "Ladda upp offerter"],
  },
  {
    id: "sheets",
    name: "Google Sheets",
    description: "Exportera kunder och ordrar automatiskt till ett delat kalkylark.",
    icon: FileSpreadsheet,
    color: "linear-gradient(135deg,#0f9d58,#34a853)",
    features: ["Auto-export av ordrar", "Dela rapport med externa partners", "Synka kundlistan"],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Skapa möten och påminnelser direkt från ärenden.",
    icon: Calendar,
    color: "linear-gradient(135deg,#4285f4,#34a853)",
    features: ["Boka möten från kundkort", "Synka deadline för kampanjer", "Påminnelser för uppföljning"],
  },
  {
    id: "docs",
    name: "Google Docs",
    description: "Generera offerter och rapporter som Google Docs direkt från systemet.",
    icon: FileText,
    color: "linear-gradient(135deg,#4285f4,#1a73e8)",
    features: ["Skapa offert från ordermall", "Exportera kundrapport", "Dela dokument med kund"],
  },
]

export default function GoogleHub() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const { data: gmailStatus, isLoading: statusLoading } = useGetGmailStatus()
  const gmailConnected = gmailStatus?.connected === true

  const syncGmail = useSyncGmail({
    mutation: {
      onSuccess: (result) => {
        setSyncError(null)
        setSyncMessage(
          result.imported > 0
            ? `${result.imported} nya mejl hämtade (${result.linked} kopplade till kund). Se Inkorgen.`
            : "Inga nya mejl — inkorgen är redan uppdaterad.",
        )
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey() })
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey({ processed: false }) })
        queryClient.invalidateQueries({ queryKey: getListEmailsQueryKey({ processed: true }) })
      },
      onError: (err: unknown) => {
        setSyncMessage(null)
        const msg = (err as { error?: string })?.error ?? "Kunde inte hämta mejl. Försök igen."
        setSyncError(msg)
      },
    },
  })

  const gmailLabel = gmailConnected && gmailStatus?.emailAddress
    ? gmailStatus.emailAddress
    : user?.gmailAddress ?? user?.username ?? "ditt Google-konto"

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Google-tjänster</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Koppla ihop ImpressiveCRM med ditt Google-konto (<span className="font-bold text-foreground">{gmailLabel}</span>)
          </p>
        </div>
      </div>

      {/* Connection status banner */}
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/40 px-6 py-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background: gmailConnected ? "linear-gradient(135deg,#10b981,#06b6d4)" : "linear-gradient(135deg,#7c3aed,#06b6d4)"}}>
          {gmailConnected ? <CheckCircle2 className="h-5 w-5 text-white" /> : <ExternalLink className="h-5 w-5 text-white" />}
        </div>
        <div>
          <p className="font-bold text-sm">
            {gmailConnected
              ? `Gmail är anslutet (${gmailStatus?.emailAddress ?? "okänt konto"})`
              : "Anslut ditt Google-konto för att aktivera tjänsterna"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {gmailConnected
              ? "Klicka på \"Hämta mejl\" på Gmail-kortet för att importera inkommande mejl till Inkorgen."
              : "Klicka på \"Anslut\" på önskad tjänst — du godkänner åtkomst via ditt Google-konto. Kontakta Robban om du behöver hjälp."}
          </p>
        </div>
      </div>

      {/* Sync feedback */}
      {syncMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0" />
          {syncMessage}
        </div>
      )}
      {syncError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {syncError}
        </div>
      )}

      {/* Service cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon
          const isGmail = service.id === "gmail"
          const connected = isGmail && gmailConnected
          return (
            <Card key={service.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
              {/* Card top bar */}
              <div className="h-1.5 w-full" style={{background: service.color}} />
              <CardContent className="p-5 flex flex-col flex-1 gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{background: service.color}}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-base">{service.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {connected ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Ansluten</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-semibold">
                            {isGmail && statusLoading ? "Kontrollerar…" : "Ej ansluten"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {service.description}
                </p>

                {/* Feature list */}
                <ul className="space-y-1.5 flex-1">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{color: "#7c3aed"}} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Action button */}
                {connected ? (
                  <button
                    className="w-full mt-2 h-9 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{background: service.color}}
                    disabled={syncGmail.isPending}
                    onClick={() => syncGmail.mutate()}
                  >
                    <RefreshCw className={`h-4 w-4 ${syncGmail.isPending ? "animate-spin" : ""}`} />
                    {syncGmail.isPending ? "Hämtar mejl…" : "Hämta mejl"}
                  </button>
                ) : (
                  <button
                    className="w-full mt-2 h-9 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{background: service.color}}
                    onClick={() =>
                      alert(
                        isGmail
                          ? "Gmail-kopplingen görs av Robban via Replit-integrationen. Kontakta Robban om status visar Ej ansluten."
                          : `Anslutning till ${service.name} är inte aktiverad ännu.`,
                      )
                    }
                  >
                    Anslut {service.name}
                  </button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
