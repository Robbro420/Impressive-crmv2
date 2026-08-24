import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Inbox, 
  Target, 
  Settings,
  Menu,
  ClipboardList,
  FolderOpen,
  LogOut,
  CalendarCheck,
  Wand2,
} from "lucide-react"
import { useListTodos } from "@workspace/api-client-react"
import { CalendarWidget } from "@/components/calendar-widget"
import { ImpressiveLogo } from "@/components/logo"
import { useAuth, logout } from "@/hooks/useAuth"

function TodosBadge() {
  const { data: todos = [] } = useListTodos()
  const count = todos.filter((t) => !t.done).length
  if (count === 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  )
}

function TodosBadgeInactive() {
  const { data: todos = [] } = useListTodos()
  const count = todos.filter((t) => !t.done).length
  if (count === 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full gradient-bg px-1.5 text-[11px] font-semibold text-white">
      {count}
    </span>
  )
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Kundlista", icon: Users },
  { href: "/orders", label: "Ordrar", icon: ShoppingCart },
  { href: "/inbox", label: "Inkorg", icon: Inbox },
  { href: "/import", label: "AI-import", icon: Wand2 },
  { href: "/todos", label: "Mersälj", icon: ClipboardList, hasBadge: true },
  { href: "/arenden", label: "Ärenden", icon: FolderOpen },
  { href: "/goals", label: "Mål", icon: Target },
  { href: "/settings", label: "Inställningar", icon: Settings },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const { user } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = import.meta.env.BASE_URL + "login"
  }
  
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-[240px] flex-col border-r border-border bg-card md:flex z-10 shrink-0">
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <ImpressiveLogo className="w-7 h-7 shrink-0" />
              <span className="font-bold text-[17px] tracking-tight text-foreground">
                Impressive<span className="gradient-text">CRM</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors cursor-pointer group",
                  isActive
                    ? "gradient-bg text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                  {item.hasBadge && (isActive ? <TodosBadge /> : <TodosBadgeInactive />)}
                </div>
              </Link>
            )
          })}
          <div className="pt-0.5">
            <CalendarWidget />
          </div>

          {/* Google Kalender — extern länk */}
          <div className="mt-1 pt-2 border-t border-border">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all group w-full"
            >
              <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              Google Kalender
              <span className="ml-auto text-[9px] font-bold text-muted-foreground/50 tracking-wider uppercase">↗</span>
            </a>
          </div>
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center gradient-bg text-[11px] font-bold text-white shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{user.displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.username}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Logga ut
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6 md:hidden shrink-0">
          <Menu className="h-6 w-6 text-muted-foreground" />
          <span className="flex items-center gap-2 font-bold text-[17px] tracking-tight">
            <ImpressiveLogo className="w-6 h-6" />
            Impressive<span className="gradient-text">CRM</span>
          </span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
          <div className="mx-auto max-w-[1560px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
