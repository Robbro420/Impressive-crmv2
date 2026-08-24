import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { login, useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"
import { ImpressiveLogo } from "@/components/logo"

export default function Login() {
  const [, navigate] = useLocation()
  const { user, loading } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) navigate("/")
  }, [user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setSubmitting(true)
    setError("")
    const result = await login(username.trim(), password)
    setSubmitting(false)
    if (result.ok) navigate("/")
    else setError(result.error)
  }

  const disabled = submitting || !username.trim() || !password.trim()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden font-sans">
      {/* Mjuka blå ljusglober — samma känsla som impressivemedia-sajterna */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[640px] w-[640px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand-to) / 0.18) 0%, transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[560px] w-[560px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--brand-from) / 0.14) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 mx-4 w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-border bg-card p-9 shadow-xl shadow-primary/5">

          {/* Logo */}
          <div className="mb-9 flex flex-col items-center">
            <ImpressiveLogo className="mb-4 h-14 w-14" />
            <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
              Impressive<span className="gradient-text">CRM</span>
            </h1>
            <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">Logga in på ditt konto</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                E-postadress
              </label>
              <input
                id="login-email"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="din@email.com"
                autoComplete="username"
                autoFocus
                disabled={submitting}
                className="h-12 w-full rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Lösenord
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
                className="h-12 w-full rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] font-medium text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full gradient-bg text-[15px] font-bold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Loggar in…
                </>
              ) : (
                "Logga in"
              )}
            </button>
          </form>

          <p className="mb-0 mt-6 text-center text-[11px] text-muted-foreground/60">
            ImpressiveCRM · Impressive Media Sweden AB
          </p>
        </div>
      </div>
    </div>
  )
}
