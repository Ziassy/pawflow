"use client";

import { useState } from "react";
import { CalendarClock, KeyRound, Shield, ShieldOff, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Badge } from "@/components/ui/badge";
import { Field, FormActions, FormDialog, useSubmit } from "@/components/form-dialog";
import { useConfirm } from "@/components/confirm-dialog";
import { DatePicker } from "@/components/date-pickers";
import { formatDay } from "@/lib/format";
import { daysLeft, extendSubscription } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { changePassword, createUser, deleteUser, resetUserPassword, setSubscription, setUserAdmin, updateProfile } from "@/server/account-actions";

export type AccountRow = { id: number; name: string; username: string; isAdmin: boolean; createdAt: string; subscriptionUntil: string | null };

const toDate = (key: string) => new Date(`${key}T00:00:00Z`);
/** Sisa hari dianggap "segera berakhir" bila 7 hari atau kurang. */
const SOON_DAYS = 7;

/** Status masa langganan dalam satu kalimat + nada warna. */
function subscriptionStatus(until: string | null, isAdmin: boolean): { text: string; tone: "muted" | "warning" | "negative" } {
  if (isAdmin) return { text: "Admin, langganan tanpa batas", tone: "muted" };
  if (!until) return { text: "Langganan tanpa batas", tone: "muted" };
  const left = daysLeft(toDate(until)) ?? 0;
  if (left === 0) return { text: `Langganan berakhir ${formatDay(until)}. Hanya bisa melihat data.`, tone: "negative" };
  const rest = left === 1 ? "hari terakhir" : `${left} hari lagi`;
  return { text: `Aktif sampai ${formatDay(until)} (${rest})`, tone: left <= SOON_DAYS ? "warning" : "muted" };
}

// --warning (L 0.62) di atas putih hanya 3,8:1; teks kecil butuh 4,5:1 -> versi lebih gelap di mode terang (5,7:1).
const toneCls = { muted: "text-muted-foreground", warning: "text-[oklch(0.52_0.12_65)] dark:text-warning", negative: "text-negative" } as const;

const inputCls = "h-11 rounded-control text-base sm:h-10 sm:text-sm";

// ---------------------------------------------------------------------------
// Akun saya
// ---------------------------------------------------------------------------

export function MyAccount({ name, username, isAdmin, subscriptionUntil }: { name: string; username: string; isAdmin: boolean; subscriptionUntil: string | null }) {
  const [form, setForm] = useState({ name, username });
  const [pwOpen, setPwOpen] = useState(false);
  // Profil & password bukan data keuangan: tetap bisa diubah walau langganan berakhir
  const { pending, submit } = useSubmit({ allowReadOnly: true });
  const dirty = form.name !== name || form.username !== username;
  const status = subscriptionStatus(subscriptionUntil, isAdmin);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border px-3 py-2.5">
        <CalendarClock className={cn("mt-0.5 size-4 shrink-0", toneCls[status.tone])} />
        <div className="min-w-0 text-sm">
          <div className="font-medium">Masa langganan</div>
          <div className={toneCls[status.tone]}>{status.text}</div>
          {status.tone !== "muted" && <div className="mt-0.5 text-xs text-muted-foreground">Hubungi admin untuk memperpanjang.</div>}
        </div>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(() => updateProfile(form), "Profil akun disimpan");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama" htmlFor="me-name">
            <Input id="me-name" autoComplete="name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Username" htmlFor="me-username" hint="Dipakai untuk masuk.">
            <Input
              id="me-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className={inputCls}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-10 rounded-control" disabled={pending || !dirty || !form.name.trim() || !form.username.trim()}>
            Simpan profil
          </Button>
          <Button type="button" variant="outline" className="h-10 rounded-control" onClick={() => setPwOpen(true)}>
            <KeyRound className="size-4" /> Ganti password
          </Button>
        </div>
      </form>
      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const { pending, submit } = useSubmit({ allowReadOnly: true });
  const mismatch = pw.confirm.length > 0 && pw.next !== pw.confirm;
  const close = () => {
    setPw({ current: "", next: "", confirm: "" });
    onOpenChange(false);
  };

  return (
    <FormDialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} icon={KeyRound} title="Ganti password" description="Perangkat lain yang masih masuk dengan password lama akan keluar otomatis.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(() => changePassword({ current: pw.current, next: pw.next }), "Password diganti", close);
        }}
      >
        <Field label="Password sekarang" htmlFor="pw-current">
          <PasswordInput id="pw-current" autoComplete="current-password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
        </Field>
        <Field label="Password baru" htmlFor="pw-next" hint="Minimal 8 karakter.">
          <PasswordInput id="pw-next" autoComplete="new-password" minLength={8} className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
        </Field>
        <Field label="Ulangi password baru" htmlFor="pw-confirm">
          <PasswordInput
            id="pw-confirm"
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? "pw-confirm-err" : undefined}
            className={inputCls}
            value={pw.confirm}
            onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
            required
          />
          {mismatch && (
            <p id="pw-confirm-err" className="text-xs text-negative">
              Belum sama dengan password baru.
            </p>
          )}
        </Field>
        <FormActions allowReadOnly pending={pending} onCancel={close} label="Ganti password" disabled={!pw.current || pw.next.length < 8 || pw.next !== pw.confirm} />
      </form>
    </FormDialog>
  );
}

// ---------------------------------------------------------------------------
// Kelola akun (admin)
// ---------------------------------------------------------------------------

export function ManageAccounts({ accounts, meId }: { accounts: AccountRow[]; meId: number }) {
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<AccountRow | null>(null);
  const [removing, setRemoving] = useState<AccountRow | null>(null);
  const [extending, setExtending] = useState<AccountRow | null>(null);
  const [dialog, confirm] = useConfirm();
  const { pending, submit } = useSubmit();
  const others = accounts.filter((a) => a.id !== meId);

  return (
    <div className="space-y-3">
      {dialog}
      <ul className="divide-y rounded-2xl border">
        {accounts.map((a) => {
          const me = a.id === meId;
          return (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  {a.isAdmin && <Badge variant="secondary">Admin</Badge>}
                  {me && <span className="text-xs text-muted-foreground">(kamu)</span>}
                </div>
                <span className="block truncate text-xs text-muted-foreground">@{a.username}</span>
                {(() => {
                  const st = subscriptionStatus(a.subscriptionUntil, a.isAdmin);
                  return <span className={cn("block text-xs", toneCls[st.tone])}>{st.text}</span>;
                })()}
              </div>
              {!me && (
                <div className="flex shrink-0 gap-0.5">
                  {!a.isAdmin && (
                    <IconAction label={`Atur langganan ${a.name}`} onClick={() => setExtending(a)}>
                      <CalendarClock className="size-4" />
                    </IconAction>
                  )}
                  <IconAction label={`Reset password ${a.name}`} onClick={() => setResetting(a)}>
                    <KeyRound className="size-4" />
                  </IconAction>
                  <IconAction
                    label={a.isAdmin ? `Cabut admin ${a.name}` : `Jadikan ${a.name} admin`}
                    disabled={pending}
                    onClick={async () => {
                      const msg = a.isAdmin
                        ? `${a.name} tidak bisa lagi menambah, mereset, atau menghapus akun.`
                        : `${a.name} bisa menambah, mereset password, dan menghapus akun lain. Data keuangan tetap terpisah.`;
                      if (await confirm(msg, { title: a.isAdmin ? "Cabut admin?" : "Jadikan admin?", confirmLabel: a.isAdmin ? "Cabut admin" : "Jadikan admin" }))
                        submit(() => setUserAdmin(a.id, !a.isAdmin), a.isAdmin ? "Admin dicabut" : "Sekarang admin");
                    }}
                  >
                    {a.isAdmin ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                  </IconAction>
                  <IconAction label={`Hapus akun ${a.name}`} danger onClick={() => setRemoving(a)}>
                    <Trash2 className="size-4" />
                  </IconAction>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {others.length === 0 && <p className="text-sm text-muted-foreground">Baru ada akunmu. Akun baru punya data sendiri yang terpisah dari datamu.</p>}
      <Button variant="outline" className="h-10 rounded-control" onClick={() => setAdding(true)}>
        <UserPlus className="size-4" /> Tambah akun
      </Button>

      <AddAccountDialog open={adding} onOpenChange={setAdding} />
      <ResetPasswordDialog account={resetting} onClose={() => setResetting(null)} />
      <SubscriptionDialog account={extending} onClose={() => setExtending(null)} />
      <DeleteAccountDialog account={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

function IconAction({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={
        "grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 " +
        (danger ? "hover:text-negative" : "hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function AddAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const empty = { name: "", username: "", password: "", isAdmin: false, subscriptionUntil: extendSubscription(null, 1) as string | null };
  const [f, setF] = useState(empty);
  const { pending, submit } = useSubmit();
  const close = () => {
    setF(empty);
    onOpenChange(false);
  };

  return (
    <FormDialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} icon={UserPlus} title="Tambah akun" description="Akun baru mulai dengan kategori dan template bawaan, tanpa data keuanganmu.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(() => createUser({ ...f, subscriptionUntil: f.isAdmin ? null : f.subscriptionUntil }), `Akun @${f.username} dibuat`, close);
        }}
      >
        <Field label="Nama" htmlFor="new-name">
          <Input id="new-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus />
        </Field>
        <Field label="Username" htmlFor="new-username" hint="Huruf kecil, angka, titik, strip, atau garis bawah. 3-32 karakter.">
          <Input
            id="new-username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={inputCls}
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })}
            required
          />
        </Field>
        <Field label="Password awal" htmlFor="new-password" hint="Minimal 8 karakter. Berikan ke pemilik akun; dia bisa menggantinya di Pengaturan.">
          <PasswordInput id="new-password" autoComplete="new-password" minLength={8} className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        </Field>
        {!f.isAdmin && (
          <Field label="Langganan sampai" htmlFor="new-until" hint="Kosongkan untuk tanpa batas. Setelah tanggal ini akun hanya bisa melihat data.">
            <DatePicker id="new-until" clearable placeholder="Tanpa batas" value={f.subscriptionUntil} onChange={(v) => setF({ ...f, subscriptionUntil: v ?? null })} />
          </Field>
        )}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5">
          <Checkbox checked={f.isAdmin} onCheckedChange={(v) => setF({ ...f, isAdmin: !!v })} className="mt-0.5 size-5" />
          <span>
            <span className="block text-sm font-medium">Jadikan admin</span>
            <span className="block text-xs text-muted-foreground">Bisa menambah, mereset password, dan menghapus akun lain.</span>
          </span>
        </label>
        <FormActions pending={pending} onCancel={close} label="Buat akun" disabled={!f.name.trim() || f.username.trim().length < 3 || f.password.length < 8} />
      </form>
    </FormDialog>
  );
}

const EXTEND_OPTIONS = [1, 3, 6, 12] as const;

function SubscriptionDialog({ account, onClose }: { account: AccountRow | null; onClose: () => void }) {
  const [until, setUntil] = useState<string | null>(null);
  const [last, setLast] = useState<AccountRow | null>(null);
  if (account !== last) {
    setLast(account);
    setUntil(account?.subscriptionUntil ?? null);
  }
  const { pending, submit } = useSubmit();
  const current = account ? subscriptionStatus(account.subscriptionUntil, false) : null;
  const base = account?.subscriptionUntil ? toDate(account.subscriptionUntil) : null;

  return (
    <FormDialog
      open={!!account}
      onOpenChange={(o) => !o && onClose()}
      icon={CalendarClock}
      title={`Langganan ${account?.name ?? ""}`}
      description="Setelah tanggal berakhir, akun hanya bisa melihat data sampai diperpanjang."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (account) submit(() => setSubscription(account.id, until), until ? `Langganan aktif sampai ${formatDay(until)}` : "Langganan tanpa batas", onClose);
        }}
      >
        {current && <p className={cn("text-sm", toneCls[current.tone])}>Sekarang: {current.text}</p>}
        <Field label="Perpanjang">
          <div className="grid grid-cols-4 gap-2">
            {EXTEND_OPTIONS.map((m) => {
              const target = extendSubscription(base, m);
              return (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  aria-pressed={until === target}
                  className={cn("h-10 rounded-control", until === target && "border-primary bg-accent text-accent-foreground")}
                  onClick={() => setUntil(target)}
                >
                  +{m} bln
                </Button>
              );
            })}
          </div>
        </Field>
        <Field label="Aktif sampai" htmlFor="sub-until" hint="Pilih tanggal sendiri, atau kosongkan untuk tanpa batas.">
          <DatePicker id="sub-until" clearable placeholder="Tanpa batas" value={until} onChange={(v) => setUntil(v ?? null)} />
        </Field>
        <FormActions pending={pending} onCancel={onClose} label="Simpan langganan" disabled={until === (account?.subscriptionUntil ?? null)} />
      </form>
    </FormDialog>
  );
}

function ResetPasswordDialog({ account, onClose }: { account: AccountRow | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const { pending, submit } = useSubmit();
  const close = () => {
    setPw("");
    onClose();
  };
  return (
    <FormDialog
      open={!!account}
      onOpenChange={(o) => !o && close()}
      icon={KeyRound}
      title={`Reset password ${account?.name ?? ""}`}
      description="Semua perangkat akun ini akan keluar. Berikan password baru ke pemiliknya."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (account) submit(() => resetUserPassword(account.id, pw), "Password direset", close);
        }}
      >
        <Field label="Password baru" htmlFor="reset-password" hint="Minimal 8 karakter.">
          <PasswordInput id="reset-password" autoComplete="new-password" minLength={8} className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
        </Field>
        <FormActions pending={pending} onCancel={close} label="Reset password" disabled={pw.length < 8} />
      </form>
    </FormDialog>
  );
}

function DeleteAccountDialog({ account, onClose }: { account: AccountRow | null; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const { pending, submit } = useSubmit();
  const close = () => {
    setTyped("");
    onClose();
  };
  return (
    <FormDialog
      open={!!account}
      onOpenChange={(o) => !o && close()}
      icon={Trash2}
      tone="danger"
      title={`Hapus akun ${account?.name ?? ""}`}
      description="Akun dan SEMUA data keuangannya (transaksi, hutang, investasi, target) dihapus permanen. Tidak bisa dibatalkan."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (account) submit(() => deleteUser(account.id, typed), "Akun dihapus", close);
        }}
      >
        <Field label={`Ketik ${account?.username ?? ""} untuk konfirmasi`} htmlFor="del-confirm">
          <Input id="del-confirm" autoComplete="off" autoCapitalize="none" spellCheck={false} className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Field>
        <FormActions pending={pending} onCancel={close} label="Hapus permanen" destructive disabled={typed.trim().toLowerCase() !== account?.username} />
      </form>
    </FormDialog>
  );
}
