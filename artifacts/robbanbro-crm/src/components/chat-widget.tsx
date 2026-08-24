import { useState, useEffect, useRef, useCallback } from "react"
import { io, type Socket } from "socket.io-client"
import { MessageCircle, X, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/useAuth"

interface ChatMessage {
  id: number
  sender: string
  content: string
  createdAt: string
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""

function getSocketUrl(): string {
  return window.location.origin
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
}

export function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [unread, setUnread] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Connect socket using session-based token
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return
    try {
      const res = await fetch(`${BASE}/api/chat/token`, { credentials: "include" })
      if (!res.ok) return
      const { token } = await res.json() as { token: string }

      const s = io(getSocketUrl(), {
        path: `${BASE}/api/socket.io`,
        transports: ["websocket", "polling"],
        auth: { token },
        autoConnect: true,
      })
      socketRef.current = s

      s.on("history", (history: ChatMessage[]) => {
        setConnected(true)
        setMessages(history)
      })

      s.on("message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg])
        setUnread((prev) => prev + 1)
      })

      s.on("connect_error", () => {
        setConnected(false)
      })

      s.on("disconnect", () => {
        setConnected(false)
      })
    } catch {
      // ignore
    }
  }, [])

  // Connect on mount if user is logged in
  useEffect(() => {
    if (user) {
      connect()
    }
    return () => {
      socketRef.current?.disconnect()
    }
  }, [user, connect])

  // When widget opens, clear unread and scroll to bottom
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 50)
    }
  }, [open])

  // Scroll to bottom on new messages when open
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, open])

  const handleSend = () => {
    const content = input.trim()
    const sender = user?.chatName ?? user?.displayName ?? "Okänd"
    if (!content || !socketRef.current?.connected) return
    socketRef.current.emit("message", { sender, content })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend()
  }

  // Don't render if not logged in
  if (!user) return null

  // ── Bubble ───────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg hover:scale-105 transition-transform"
        style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
        aria-label="Öppna chatt"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    )
  }

  // ── Chat panel ───────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-80 h-[480px] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
      style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.25)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0"
        style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-300" : "bg-white/40")} />
          <span className="font-semibold text-sm">Teamchatt</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-white">
        <div className="p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">Inga meddelanden än</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender === (user?.chatName ?? user?.displayName)
            return (
              <div key={msg.id} className={cn("flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                <span className="text-[10px] text-muted-foreground px-1">{msg.sender} · {formatTime(msg.createdAt)}</span>
                <div className={cn(
                  "max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-snug",
                  isMe
                    ? "text-white rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                )}
                  style={isMe ? { background: "linear-gradient(135deg,#7c3aed,#06b6d4)" } : {}}>
                  {msg.content}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t bg-white shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Skriv ett meddelande…"
          className="flex-1 text-sm h-9 rounded-full bg-secondary/50 border-0 focus-visible:ring-1"
          disabled={!connected}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || !connected}
          size="icon"
          className="h-9 w-9 rounded-full shrink-0 text-white border-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)" }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
