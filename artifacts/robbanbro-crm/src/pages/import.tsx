import { useState } from "react"
import { useCreateCustomer, useCreateOrder, useListCustomers } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2, CheckCircle2, Wand2, RotateCcw } from "lucide-react"
import { useLocation } from "wouter"

type Parsed = {
  kund: {
    namn: string | null
    orgnr: string | null
    kundnummer: string | null
    kontaktperson: string | null
    epost: string | null
    telefon: string | null
    adress: string | null
    postnummer: string | null
    ort: string | null
  }
  order: {
    ordernummer: string | null
    amne: string | null
    belopp_exkl_moms: number | null
    orderdatum: string | null
    kampanjstart: string | null
    kampanjslut: string | null
    beskrivning: string | null
    betalvillkor: string | null
  }
}

export default function ImportPage() {
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const [text, setText] = useState("")
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedCustomerId, setSavedCustomerId] = useState<number | null>(null)

  const { data: customers = [] } = useListCustomers()
  const createCustomer = useCreateCustomer()
  const createOrder = useCreateOrder()

  const handleParse = async () => {
    setParsing(true); setError(null)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/import/parse-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Tolkningen misslyckades")
      }
      setParsed(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel")
    } finally {
      setParsing(false)
    }
  }

  const set = (path: "kund" | "order", key: string, value: string) => {
    if (!parsed) return
    setParsed({ ...parsed, [path]: { ...parsed[path], [key]: value === "" ? null : value } })
  }

  const handleSave = async () => {
    if (!parsed) return
    setSaving(true); setError(null)
    try {
      // Finns kunden redan? Matcha på kundnummer eller e-post
      const existing = customers.find(c =>
        (parsed.kund.kundnummer && c.customerNumber === parsed.kund.kundnummer) ||
        (parsed.kund.epost && c.email && c.email.toLowerCase() === parsed.kund.epost.toLowerCase())
      )

      let customerId: number
      if (existing) {
        customerId = existing.id
      } else {
        const notes = [
          parsed.kund.kontaktperson ? `Kontaktperson: ${parsed.kund.kontaktperson}` : null,
          parsed.kund.orgnr ? `Org.nr: ${parsed.kund.orgnr}` : null,
        ].filter(Boolean).join("\n")
        const customer = await createCustomer.mutateAsync({
          data: {
            name: parsed.kund.namn || "Okänd kund",
            email: parsed.kund.epost || "",
            phone: parsed.kund.telefon || undefined,
            company: parsed.kund.namn || undefined,
            address: parsed.kund.adress || undefined,
            city: parsed.kund.ort || undefined,
            postalCode: parsed.kund.postnummer || undefined,
            category: "ovrigt",
            status: "aktiv",
            customerNumber: parsed.kund.kundnummer || undefined,
            notes: notes || undefined,
          },
        })
        customerId = customer.id
      }

      const today = new Date().toISOString().slice(0, 10)
      const start = parsed.order.kampanjstart || parsed.order.orderdatum || today
      await createOrder.mutateAsync({
        data: {
          customerId,
          subject: parsed.order.amne || "Importerad order",
          orderText: text,
          orderNumber: parsed.order.ordernummer || undefined,
          status: parsed.order.kampanjslut && parsed.order.kampanjslut < today ? "klar" : "aktiv",
          amount: parsed.order.belopp_exkl_moms ?? undefined,
          campaignStart: start,
          campaignEnd: parsed.order.kampanjslut || undefined,
          notes: [
            parsed.order.beskrivning ? `Orderrader: ${parsed.order.beskrivning}` : null,
            parsed.order.betalvillkor ? `Betalvillkor: ${parsed.order.betalvillkor}` : null,
          ].filter(Boolean).join("\n") || undefined,
          orderDate: new Date((parsed.order.orderdatum || today) + "T12:00:00Z").toISOString(),
        },
      })

      queryClient.invalidateQueries()
      setSavedCustomerId(customerId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte spara")
    } finally {
      setSaving(false)
    }
  }

  const reset = () => { setText(""); setParsed(null); setError(null); setSavedCustomerId(null) }

  // ── Sparad-vy ──────────────────────────────────────────────────────────────
  if (savedCustomerId) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2">Order importerad! 🎉</h1>
        <p className="text-muted-foreground text-sm mb-8">Kunden och ordern är nu inlagda i CRM:et med kampanjdatum.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => setLocation(`/customers/${savedCustomerId}`)}>Visa kunden</Button>
          <Button variant="outline" onClick={reset} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Importera fler</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <Wand2 className="h-7 w-7 text-primary" /> AI-import
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          Klistra in texten från en orderbekräftelse (mail eller PDF) — AI:n plockar ut kund- och orderinfo automatiskt.
        </p>
      </div>

      {!parsed ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Klistra in hela orderbekräftelsen här...\n\nT.ex. mailtexten + texten från PDF:n. Ju mer text desto bättre tolkning."}
              className="min-h-[280px] font-mono text-[13px]"
            />
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <Button onClick={handleParse} disabled={parsing || text.trim().length < 20} className="gap-2">
              {parsing ? <><Loader2 className="h-4 w-4 animate-spin" /> Tolkar med AI...</> : <><Sparkles className="h-4 w-4" /> Tolka med AI</>}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kund</CardTitle>
              <CardDescription>Granska och justera innan du sparar</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ["namn", "Företag/Namn"], ["orgnr", "Org.nr"], ["kundnummer", "Kundnr"],
                ["kontaktperson", "Kontaktperson"], ["epost", "E-post"], ["telefon", "Telefon"],
                ["adress", "Adress"], ["postnummer", "Postnr"], ["ort", "Ort"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                  <Input value={(parsed.kund as Record<string, string | null>)[key] ?? ""} onChange={(e) => set("kund", key, e.target.value)} className="mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order & kampanj</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Ordernummer</label>
                <Input value={parsed.order.ordernummer ?? ""} onChange={(e) => set("order", "ordernummer", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Belopp exkl. moms (kr)</label>
                <Input type="number" value={parsed.order.belopp_exkl_moms ?? ""} onChange={(e) => setParsed({ ...parsed, order: { ...parsed.order, belopp_exkl_moms: e.target.value === "" ? null : Number(e.target.value) } })} className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Ämne</label>
                <Input value={parsed.order.amne ?? ""} onChange={(e) => set("order", "amne", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kampanjstart</label>
                <Input type="date" value={parsed.order.kampanjstart ?? ""} onChange={(e) => set("order", "kampanjstart", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Kampanjslut → auto-uppföljning</label>
                <Input type="date" value={parsed.order.kampanjslut ?? ""} onChange={(e) => set("order", "kampanjslut", e.target.value)} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sparar...</> : <><CheckCircle2 className="h-4 w-4" /> Spara kund + order</>}
            </Button>
            <Button variant="outline" onClick={() => setParsed(null)}>Tillbaka till texten</Button>
          </div>
        </div>
      )}
    </div>
  )
}
