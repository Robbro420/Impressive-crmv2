import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { login, useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(248_25%_8%)] font-sans">
      {/* Subtle static accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(255 55% 52% / 0.35) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 mx-4 w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-9 shadow-2xl backdrop-blur-xl">

          {/* Logo */}
          <div className="mb-9 flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
              <span className="text-xl font-black text-primary-foreground">I</span>
            </div>
            <h1 className="text-[21px] font-extrabold tracking-tight text-white">
              Impressive<span className="text-[hsl(255_70%_74%)]">CRM</span>
            </h1>
            <p className="mt-1.5 text-[13px] font-medium text-white/40">Logga in på ditt konto</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
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
                className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white outline-none transition placeholder:text-white/25 focus:border-[hsl(255_60%_66%)] focus:ring-2 focus:ring-[hsl(255_60%_66%/0.25)]"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50">
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
                className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white outline-none transition placeholder:text-white/25 focus:border-[hsl(255_60%_66%)] focus:ring-2 focus:ring-[hsl(255_60%_66%/0.25)]"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-bold text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
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

          <p className="mb-0 mt-6 text-center text-[11px] text-white/25">
            ImpressiveCRM · Impressive Media AB
          </p>
        </div>
      </div>
    </div>
  )
}
