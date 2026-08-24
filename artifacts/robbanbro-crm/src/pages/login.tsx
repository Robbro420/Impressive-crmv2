import { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { login, useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

/* ─── Floating particle ─── */
interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  speedX: number
  speedY: number
}

function useParticles(count = 60) {
  const [particles, setParticles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      speedX: (Math.random() - 0.5) * 0.015,
      speedY: (Math.random() - 0.5) * 0.015,
    }))
  )

  useEffect(() => {
    let raf: number
    const tick = () => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: ((p.x + p.speedX + 100) % 100),
          y: ((p.y + p.speedY + 100) % 100),
        }))
      )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return particles
}

export default function Login() {
  const [, navigate] = useLocation()
  const { user, loading } = useAuth()
  const particles = useParticles(70)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#07071a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      fontFamily: "'Outfit', sans-serif",
    }}>

      {/* ── Animated star particles ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p) => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.id % 3 === 0 ? "#a78bfa" : p.id % 3 === 1 ? "#67e8f9" : "#ffffff",
            opacity: p.opacity,
            boxShadow: p.size > 2 ? `0 0 ${p.size * 3}px currentColor` : undefined,
          }} />
        ))}
      </div>

      {/* ── Glowing arch / orb at bottom ── */}
      <div style={{
        position: "absolute",
        bottom: "-180px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "900px",
        height: "900px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 50% 40%, #7c3aed55 0%, #06b6d425 40%, transparent 70%)",
        filter: "blur(40px)",
        animation: "pulse-orb 6s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* ── Second orb (top-right accent) ── */}
      <div style={{
        position: "absolute",
        top: "-120px",
        right: "-120px",
        width: "500px",
        height: "500px",
        borderRadius: "50%",
        background: "radial-gradient(circle, #06b6d420 0%, transparent 70%)",
        filter: "blur(60px)",
        animation: "pulse-orb 8s ease-in-out infinite reverse",
        pointerEvents: "none",
      }} />

      {/* ── Horizontal glow lines (like the Figma arch lines) ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", pointerEvents: "none", overflow: "hidden" }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            bottom: `${i * 40 + 20}px`,
            left: 0,
            right: 0,
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? "#7c3aed" : "#06b6d4"}${Math.round(30 - i * 3).toString(16).padStart(2,"0")}, transparent)`,
            opacity: 0.4 - i * 0.04,
            animation: `line-glow ${3 + i * 0.4}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>

      {/* ── Main card ── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "100%",
        maxWidth: "420px",
        margin: "0 16px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(167,139,250,0.15)",
          borderRadius: "24px",
          padding: "40px 36px",
          boxShadow: "0 0 80px rgba(124,58,237,0.15), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 30px rgba(124,58,237,0.5), 0 0 60px rgba(6,182,212,0.2)",
              marginBottom: 16,
              animation: "logo-float 4s ease-in-out infinite",
            }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>I</span>
            </div>
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: "-0.5px" }}>
              Impressive<span style={{
                background: "linear-gradient(135deg,#a78bfa,#67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>CRM</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6, fontWeight: 500 }}>
              Logga in på ditt konto
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username */}
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                E-postadress
              </label>
              <GlowInput
                type="email"
                value={username}
                onChange={setUsername}
                placeholder="din@email.com"
                autoFocus
                autoComplete="username"
                disabled={submitting}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Lösenord
              </label>
              <GlowInput
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 12,
                padding: "10px 14px",
                color: "#fca5a5",
                fontSize: 13,
                fontWeight: 500,
                animation: "shake 0.4s ease",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password.trim()}
              style={{
                marginTop: 8,
                height: 48,
                borderRadius: 12,
                border: "none",
                background: submitting || !username.trim() || !password.trim()
                  ? "rgba(124,58,237,0.3)"
                  : "linear-gradient(135deg,#7c3aed,#06b6d4)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: submitting || !username.trim() || !password.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "opacity 0.2s, transform 0.1s",
                boxShadow: submitting || !username.trim() || !password.trim()
                  ? "none"
                  : "0 0 20px rgba(124,58,237,0.4), 0 0 40px rgba(6,182,212,0.15)",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)" }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)" }}
            >
              {submitting
                ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Loggar in…</>
                : "Logga in"}
            </button>
          </form>

          {/* Footer hint */}
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 24, marginBottom: 0 }}>
            ImpressiveCRM · Impressive Media AB
          </p>
        </div>
      </div>

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.06); }
        }
        @keyframes logo-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes line-glow {
          0% { opacity: 0.15; }
          100% { opacity: 0.5; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

/* ── Glass input with glow on focus ── */
function GlowInput({ type, value, onChange, placeholder, autoFocus, autoComplete, disabled }: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 100) }, [])

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: 48,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${focused ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12,
          padding: "0 16px",
          color: "#fff",
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 500,
          outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxSizing: "border-box",
          boxShadow: focused
            ? "0 0 0 3px rgba(124,58,237,0.2), 0 0 20px rgba(124,58,237,0.15)"
            : "none",
        }}
      />
    </div>
  )
}
