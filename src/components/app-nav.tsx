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
            <span className="text-foreground">Paw</span>
            <span className="text-primary">Flow</span>
          </span>
          <span className="block text-[11px] text-muted-foreground">Find your flow</span>
        </span>
      )}
    </Link>
  );
}

type NavUser = { name: string; username: string };

/** Siapa yang sedang masuk. Inisial sebagai penanda, bukan foto. */
function UserChip({ user, collapsed }: { user: NavUser; collapsed?: boolean }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2", collapsed && "justify-center px-0")} title={collapsed ? `${user.name} (@${user.username})` : undefined}>
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
        {initial}
      </span>
      {collapsed ? (
        <span className="sr-only">
          Masuk sebagai {user.name} (@{user.username})
        </span>
      ) : (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">@{user.username}</span>
        </span>
      )}
    </div>
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
export function Sidebar({ defaultCollapsed = false, user }: { defaultCollapsed?: boolean; user: NavUser }) {
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
        <UserChip user={user} collapsed={collapsed} />
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
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 lg:hidden">
      <Brand />
    </header>
  );
}

/**
 * Tombol catat transaksi melayang untuk HP, tepat di atas slot "Lainnya" di ujung kanan dock:
 * zona jempol kanan. Tinggi dock = 62px (h-12 + p-1.5 + border), jarak ke dock 0.75rem.
 * /catat mengarahkan ke halaman bulan berjalan.
 */
function QuickAddButton() {
  return (
    <Link
      href="/catat"
      aria-label="Catat transaksi"
      title="Catat transaksi"
      className={cn(
        "fixed right-[1.125rem] bottom-[calc(env(safe-area-inset-bottom)+0.75rem+62px+0.75rem)] z-40 grid size-14 place-items-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg ring-4 ring-background outline-none",
        "transition-transform duration-150 active:scale-95 motion-reduce:transition-none focus-visible:ring-ring/50",
        // sm: dock 26rem di tengah -> sejajarkan dengan ujung kanannya
        "sm:right-[calc(50%-13rem+0.375rem)] lg:hidden",
      )}
    >
      <Plus className="size-6" strokeWidth={2.5} />
    </Link>
  );
}

/**
 * Isi satu slot dock: ikon selalu tampil, label hanya terlihat saat aktif.
 * Label tetap ada di DOM (opacity 0) agar slot ikon-saja tetap punya nama aksesibel.
 * Lebar label dianimasikan lewat grid-template-columns 0fr -> 1fr.
 */
function DockSlot({ icon: Icon, label, color, active }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; color: string; active: boolean }) {
  return (
    <>
      <Icon className="size-5 shrink-0" style={{ color }} />
      <span
        className={cn(
          "grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-out motion-reduce:transition-none",
          active ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0",
        )}
      >
        <span className="truncate text-[13px] font-semibold text-foreground">{label}</span>
      </span>
    </>
  );
}

/**
 * Dock melayang untuk HP. Item aktif melebar dan memakai warna identitas menunya;
 * item lain cuma ikon. Item non-utama ada di sheet "Lainnya", dan slot itu
 * menampilkan halaman aktifnya bila pengguna sedang di salah satu halaman tersebut.
 */
export function BottomNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.mobile);
  const moreItem = NAV_ITEMS.find((i) => !i.mobile && isActive(pathname, i.href));

  // Slot aktif tumbuh (flex-grow dianimasikan); slot lain berbagi sisa lebar sebagai area sentuh.
  const slotCls = (active: boolean) =>
    cn(
      "flex h-12 min-w-0 cursor-pointer basis-0 items-center justify-center gap-2 rounded-full px-3 outline-none",
      "transition-[flex-grow,background-color,transform] duration-300 ease-out active:scale-95 motion-reduce:transition-none",
      "focus-visible:ring-3 focus-visible:ring-ring/40",
      active ? "grow-[2.6]" : "grow hover:bg-secondary",
    );
  // Latar slot aktif: tint warna menu di atas kartu, label tetap text-foreground agar kontras AA aman.
  const tint = (color: string) => ({ background: `color-mix(in oklab, ${color} 16%, var(--card))` });

  return (
    <>
      <QuickAddButton />
      <nav
        aria-label="Navigasi utama"
        // Satu-satunya elemen blur: konten di-scroll di bawah dock, blur menjaga ikon tetap terbaca.
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-full border bg-card/90 p-1.5 shadow-card backdrop-blur-md sm:inset-x-auto sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2 lg:hidden"
      >
        {primary.map(({ href, label, icon, color }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={slotCls(active)} style={active ? tint(color) : undefined}>
              <DockSlot icon={icon} label={label} color={color} active={active} />
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className={slotCls(!!moreItem)} style={moreItem ? tint(moreItem.color) : undefined}>
            {moreItem ? (
              <DockSlot icon={moreItem.icon} label={moreItem.short ?? moreItem.label} color={moreItem.color} active />
            ) : (
              <DockSlot icon={Menu} label="Lainnya" color="var(--muted-foreground)" active={false} />
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="mx-4 rounded-2xl bg-secondary/60">
              <UserChip user={user} />
            </div>
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
    </>
  );
}
