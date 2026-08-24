import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building, Mail, AlertTriangle, ShieldCheck, Users, Check, Lock } from "lucide-react"
import { useAuth, updateProfile } from "@/hooks/useAuth"

export default function Settings() {
  const { user, refetch } = useAuth()

  // Team settings
  const [chatName, setChatName] = useState("")
  const [colleagueEmail, setColleagueEmail] = useState("")
  const [gmailAddress, setGmailAddress] = useState("")
  const [savedTeam, setSavedTeam] = useState(false)
  const [teamError, setTeamError] = useState("")

  // Password change
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savedPassword, setSavedPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // Sync from loaded user
  useEffect(() => {
    if (user) {
      setChatName(user.chatName ?? user.displayName)
      setColleagueEmail(user.colleagueEmail ?? "")
      setGmailAddress(user.gmailAddress ?? "")
    }
  }, [user])

  const handleSaveTeam = async () => {
    setTeamError("")
    const result = await updateProfile({ chatName, colleagueEmail, gmailAddress })
    if (result.ok) {
      setSavedTeam(true)
      setTimeout(() => setSavedTeam(false), 2000)
    } else {
      setTeamError(result.error)
    }
  }

  const handleSavePassword = async () => {
    setPasswordError("")
    if (newPassword !== confirmPassword) {
      setPasswordError("Lösenorden matchar inte")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("Lösenordet måste vara minst 6 tecken")
      return
    }
    const result = await updateProfile({ password: currentPassword, newPassword })
    if (result.ok) {
      setSavedPassword(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setSavedPassword(false), 2000)
    } else {
      setPasswordError(result.error)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inställningar</h1>
        <p className="text-muted-foreground mt-1 text-sm">Hantera din profil och integrationer.</p>
      </div>

      <div className="grid gap-6">

        {/* Team / Profile */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-secondary/10 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md shadow-sm border border-border/50 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Min profil</CardTitle>
                <CardDescription className="mt-0.5">
                  {user ? `Inloggad som ${user.displayName} (${user.username})` : "Dina uppgifter för chatt och e-postutskick"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-foreground">Visningsnamn i chatten</label>
              <div className="max-w-md">
                <Input
                  placeholder="T.ex. Robin"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">Visas som avsändare i chatten.</p>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-semibold text-foreground">Kollegans e-postadress</label>
              <div className="max-w-md">
                <Input
                  type="email"
                  placeholder="kollega@impressivemedia.se"
                  value={colleagueEmail}
                  onChange={(e) => setColleagueEmail(e.target.value)}
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">Fylls i automatiskt när du skickar ett ärende via mejl.</p>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-semibold text-foreground">Din Gmail-adress</label>
              <div className="max-w-md">
                <Input
                  type="email"
                  placeholder="din@gmail.com"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">Används för Gmail-integration.</p>
            </div>

            {teamError && (
              <p className="text-sm text-destructive font-medium">{teamError}</p>
            )}

            <Button onClick={handleSaveTeam} variant={savedTeam ? "default" : "outline"} className="mt-1">
              {savedTeam ? <><Check className="h-4 w-4 mr-1" /> Sparat</> : "Spara profil"}
            </Button>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-secondary/10 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md shadow-sm border border-border/50 text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Byt lösenord</CardTitle>
                <CardDescription className="mt-0.5">Ändra ditt inloggningslösenord</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 max-w-md">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Nuvarande lösenord</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-background" placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Nytt lösenord</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background" placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Bekräfta nytt lösenord</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-background" placeholder="••••••••" />
            </div>

            {passwordError && (
              <p className="text-sm text-destructive font-medium">{passwordError}</p>
            )}

            <Button
              onClick={handleSavePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              variant={savedPassword ? "default" : "outline"}
            >
              {savedPassword ? <><Check className="h-4 w-4 mr-1" /> Lösenord bytt</> : "Byt lösenord"}
            </Button>
          </CardContent>
        </Card>

        {/* Email integration */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-secondary/10 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md shadow-sm border border-border/50 text-blue-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">E-mail Integration</CardTitle>
                <CardDescription className="mt-0.5">Konfigurera inkommande webhook från Postmark</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="p-5 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <p className="font-semibold text-sm text-foreground">Webhook URL</p>
              </div>
              <code className="bg-background px-4 py-2.5 rounded-md border border-border/60 block select-all font-mono text-[13px] shadow-inner text-foreground/90">
                {window.location.origin}/api/emails/webhook
              </code>
              <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                Kopiera denna URL och klistra in i Postmark-panelen under ditt Servers <span className="font-medium text-foreground">Inbound Webhook settings</span>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="shadow-sm border-destructive/20 mt-4">
          <CardHeader className="bg-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-md shadow-sm border border-destructive/20 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-destructive">Farlig Zon</CardTitle>
                <CardDescription className="mt-0.5">Avancerade systemåtgärder</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg bg-card">
              <div>
                <p className="font-semibold text-sm text-foreground mb-1">Rensa all cache</p>
                <p className="text-sm text-muted-foreground">Tvingar appen att hämta all data på nytt från servern.</p>
              </div>
              <Button variant="destructive" className="shadow-sm font-medium" onClick={() => window.location.reload()}>Rensa Cache</Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
