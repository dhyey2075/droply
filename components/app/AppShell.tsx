"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState, type ComponentType, type ReactNode } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import {
  FolderClosed,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Shield,
  Sun,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useClerkAppearance } from "@/components/clerk-appearance"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Files", icon: FolderClosed },
  { href: "/ask", label: "Ask", icon: MessageSquareText },
]

const ADMIN_ITEM: NavItem = { href: "/admin", label: "Admin", icon: Shield }

function useNavItems() {
  const { user } = useUser()
  const isAdmin = user?.publicMetadata?.role === "admin"
  return isAdmin ? [...NAV, ADMIN_ITEM] : NAV
}

function Logo({ withName = true }: { withName?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/droply.ico" alt="" className="size-6 shrink-0" />
      {withName && <span className="text-[15px] font-semibold tracking-[-0.02em]">Droply</span>}
    </Link>
  )
}

function NavLinks({ rail = false, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = useNavItems()
  return (
    <nav className={cn("flex flex-col gap-0.5", rail && "items-center")}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={rail ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              rail ? "size-9 justify-center" : "h-8 gap-2.5 px-2.5",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-foreground")} />
            {!rail && label}
          </Link>
        )
      })}
    </nav>
  )
}

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

function ThemeSwitch({ rail = false }: { rail?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className={rail ? "size-9" : "h-8"} />

  if (rail) {
    const index = THEMES.findIndex((t) => t.value === theme)
    const current = THEMES[index === -1 ? 2 : index]
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length]
    const Icon = current.icon
    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        title={`Theme: ${current.label}`}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-0.5 rounded-lg border border-sidebar-border bg-background/60 p-0.5">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-7 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        )
      })}
    </div>
  )
}

function Account({ rail = false }: { rail?: boolean }) {
  const appearance = useClerkAppearance()
  return (
    <UserButton
      showName={!rail}
      appearance={{
        ...appearance,
        elements: {
          ...appearance.elements,
          rootBox: rail ? "" : "w-full",
          userButtonTrigger:
            "w-full rounded-md px-1.5 py-1 hover:bg-sidebar-accent/60 focus:shadow-none focus-visible:ring-2 focus-visible:ring-ring/30",
          userButtonBox: { flexDirection: "row-reverse", justifyContent: "flex-end", gap: "0.625rem", width: "100%" },
          userButtonOuterIdentifier: { fontSize: "0.875rem", fontWeight: 500, paddingLeft: 0, overflow: "hidden", textOverflow: "ellipsis" },
          avatarBox: "size-7",
        },
      }}
    />
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>
      <div className="px-2.5 pt-1">
        <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">Workspace</p>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="mt-auto space-y-3 border-t border-sidebar-border p-3">
        <ThemeSwitch />
        <Account />
      </div>
    </div>
  )
}

/**
 * Signed-in layout: a sidebar on desktop (or an icon rail with `rail`), a top bar with a
 * slide-out menu on mobile. With `rail`, the page supplies its own mobile navigation.
 */
export function AppShell({ children, rail = false }: { children: ReactNode; rail?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      {rail ? (
        <aside className="sticky top-0 hidden h-[100dvh] w-[60px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-3 lg:flex">
          <Logo withName={false} />
          <div className="mt-5">
            <NavLinks rail />
          </div>
          <div className="mt-auto flex flex-col items-center gap-2">
            <ThemeSwitch rail />
            <Account rail />
          </div>
        </aside>
      ) : (
        <aside className="sticky top-0 hidden h-[100dvh] w-[232px] shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarBody />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {!rail && (
          <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background px-3 lg:hidden">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Menu className="size-[18px]" />
              </button>
              <Logo />
            </div>
            <Account rail />
          </header>
        )}
        {children}
      </div>

      {!rail && (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[264px] p-0 sm:max-w-[264px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarBody onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export { NavLinks, ThemeSwitch }
