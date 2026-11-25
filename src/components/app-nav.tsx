"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/app/login/actions";
import { NAV_GROUPS, NAV_ITEMS, SIDEBAR_COOKIE, isActive } from "./nav-items";

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark-96.png" alt="" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight sm:text-[17px]">
            <span className="text-[#14285a]">Paw</span>
            <span className="text-primary">Flow</span>
          </span>
          <span className="block text-[11px] text-muted-foreground">Find your flow</span>
        </span>
      )}
    </Link>
  );
}

function LogoutButton({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        title={collapsed ? "Keluar" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-negative-soft hover:text-negative",
          collapsed && "justify-center px-0",
          className,
        )}
      >
        <LogOut className="size-4" />
        {!collapsed && "Keluar"}
      </button>
    </form>
  );
}

/** Sidebar desktop: menu berkelompok, bisa diciutkan (diingat di cookie). */
export function Sidebar({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar py-5 transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-[76px] px-3" : "w-64 px-4",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-1")}>
        <Brand collapsed={collapsed} />
      </div>

      <Link
        href="/catat"
        title={collapsed ? "Catat transaksi" : undefined}
        className={cn(
          "mt-6 flex h-10 items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground shadow-card transition-all hover:-translate-y-px hover:brightness-110 active:translate-y-0",
          collapsed && "mx-auto w-10",
        )}
      >
        <Plus className="size-4" />
        {!collapsed && "Catat transaksi"}
      </Link>

      <nav className="mt-5 flex-1 space-y-5 overflow-y-auto" aria-label="Navigasi utama">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden />
            ) : (
              <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">{g.label}</div>
            )}
            <ul className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon, hint, color }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : hint}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl py-2 text-sm transition-all duration-150",
                        collapsed ? "justify-center px-0" : "px-3",
                        active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                      style={active ? { background: `color-mix(in oklab, ${color} 10%, transparent)` } : undefined}
                    >
                      {active && !collapsed && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full" style={{ background: color }} />}
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg transition-all duration-150 group-hover:scale-105",
                          active && "text-white shadow-card",
                        )}
                        style={
                          active
                            ? { background: color }
                            : { background: `color-mix(in oklab, ${color} 13%, transparent)`, color }
                        }
                      >
                        <Icon className="size-4" />
                      </span>
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t pt-3">
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Lebarkan menu" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Ciutkan menu"}
        </button>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}

/** Top bar untuk HP. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
      <Brand />
      <Link href="/catat" aria-label="Catat transaksi" className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card">
        <Plus className="size-4" />
      </Link>
    </header>
  );
}

/** Bottom nav melayang untuk HP. Item non-utama ada di sheet "Lainnya". */
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.mobile);
  const moreActive = NAV_ITEMS.filter((i) => !i.mobile).some((i) => isActive(pathname, i.href));

  const itemCls = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground active:bg-secondary",
    );

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-2xl border bg-card p-1.5 shadow-card sm:inset-x-auto sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2 lg:hidden"
    >
      {primary.map(({ href, label, icon: Icon, color }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={itemCls(isActive(pathname, href))}>
          <Icon className="size-5" style={isActive(pathname, href) ? undefined : { color }} />
          {label}
        </Link>
      ))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={itemCls(moreActive)}>
          <Menu className="size-5" />
          Lainnya
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4">
            {NAV_GROUPS.map((g) => {
              const items = g.items.filter((i) => !i.mobile);
              if (!items.length) return null;
              return (
                <div key={g.label}>
                  <div className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.label}</div>
                  {items.map(({ href, label, icon: Icon, hint, color }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", isActive(pathname, href) ? "bg-accent text-accent-foreground" : "text-foreground")}
                    >
                      <span
                        className="grid size-9 place-items-center rounded-lg"
                        style={isActive(pathname, href) ? { background: color, color: "white" } : { background: `color-mix(in oklab, ${color} 13%, transparent)`, color }}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium sm:text-[15px]">{label}</span>
                        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              );
            })}
            <LogoutButton className="py-3 text-base" />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
