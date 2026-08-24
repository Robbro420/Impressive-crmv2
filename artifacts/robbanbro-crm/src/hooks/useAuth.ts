import { useState, useEffect, useCallback } from "react"

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""

export interface AuthUser {
  id: number
  username: string
  displayName: string
  gmailAddress: string | null
  colleagueEmail: string | null
  chatName: string
}

let cachedUser: AuthUser | null | "loading" = "loading"
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, { credentials: "include" })
    if (res.status === 401) return null
    if (!res.ok) return null
    return await res.json() as AuthUser
  } catch {
    return null
  }
}

export async function login(username: string, password: string): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  })
  if (res.ok) {
    const user = await res.json() as AuthUser
    cachedUser = user
    notify()
    return { ok: true, user }
  }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? "Inloggning misslyckades" }
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" })
  cachedUser = null
  notify()
}

export async function updateProfile(patch: Partial<Omit<AuthUser, "id" | "username"> & { password: string; newPassword: string }>): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const res = await fetch(`${BASE}/api/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  })
  if (res.ok) {
    const user = await res.json() as AuthUser
    cachedUser = user
    notify()
    return { ok: true, user }
  }
  const body = await res.json().catch(() => ({})) as { error?: string }
  return { ok: false, error: body.error ?? "Kunde inte spara" }
}

// Initialise once on module load
fetchMe().then((user) => {
  cachedUser = user
  notify()
})

export function useAuth() {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const fn = () => forceRender((n) => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const refetch = useCallback(async () => {
    const user = await fetchMe()
    cachedUser = user
    notify()
    return user
  }, [])

  return {
    user: cachedUser === "loading" ? undefined : cachedUser,
    loading: cachedUser === "loading",
    refetch,
  }
}
