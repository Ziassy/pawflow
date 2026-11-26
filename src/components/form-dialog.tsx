"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/actions";

/** Kelas dialog modern: kartu besar di desktop, bottom sheet di HP. */
export const dialogCls = cn(
  "gap-0 overflow-hidden rounded-3xl p-0 shadow-2xl ring-1 ring-foreground/5",
  "max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:data-open:slide-in-from-bottom-10",
);

export function DialogHero({
  icon: Icon,
  title,
  description,
  tone = "brand",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: "brand" | "danger" | "positive";
}) {
  const toneCls = {
    brand: "bg-linear-135 from-hero-from to-hero-to text-white",
    danger: "bg-negative-soft text-negative",
    positive: "bg-positive-soft text-positive",
  }[tone];
  return (
    <DialogHeader className="flex-row items-center gap-3 border-b bg-linear-180 from-accent/60 to-transparent px-4 pt-5 pb-4 sm:gap-3.5 sm:px-6 sm:pt-6 sm:pb-5">
      <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden" />
      {Icon && (
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl shadow-card sm:size-11", toneCls)}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0 text-left">
        <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
        {description && <DialogDescription className="mt-0.5">{description}</DialogDescription>}
      </div>
    </DialogHeader>
  );
}

/**
 * Dialog form modern. Isi `children` = <form> dengan <FormActions> di akhir.
 * Dipakai untuk tambah/edit hutang, piutang, investasi, target, dll.
 */
export function FormDialog({
  trigger,
  title,
  description,
  open,
  onOpenChange,
  children,
  wide,
  icon,
  tone,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
  wide?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "danger" | "positive";
}) {
  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(dialogCls, wide ? "sm:max-w-xl" : "sm:max-w-md")}>
          <DialogHero icon={icon} title={title} description={description} tone={tone} />
          <div className="max-h-[75dvh] overflow-y-auto px-4 pt-4 pb-4 sm:max-h-[70dvh] sm:px-6 sm:pt-5 sm:pb-6 [&_form]:space-y-3 sm:[&_form]:space-y-5 max-sm:[&_form]:pb-16">{children}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} title={label} className="block truncate text-[13px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const selectCls =
  "h-10 w-full rounded-control border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/30 md:text-sm";

/** Hook: jalankan server action, tampilkan toast, tutup dialog jika berhasil. */
export function useSubmit() {
  const [pending, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult>, ok?: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (ok) toast.success(ok);
        after?.();
      } else toast.error("error" in res ? res.error : "Gagal");
    });
  return { pending, submit };
}

/** Footer dialog: lebar penuh di HP, rata kanan di desktop. */
export function FormActions({
  pending,
  onCancel,
  label = "Simpan",
  extra,
  disabled,
  destructive,
}: {
  pending: boolean;
  onCancel: () => void;
  label?: string;
  extra?: React.ReactNode;
  disabled?: boolean;
  /** Tombol kirim merah untuk aksi yang menghapus permanen. */
  destructive?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 flex flex-col-reverse gap-2 border-t bg-secondary px-4 py-3 sm:static sm:-mx-6 sm:-mb-6 sm:bg-secondary/50 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-sm:self-center">{extra}</div>
      <div className="flex gap-2 max-sm:w-full">
        <Button type="button" variant="outline" className="h-11 flex-1 rounded-control bg-card sm:h-10 sm:flex-none" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" variant={destructive ? "destructive" : "default"} className="h-11 min-w-28 flex-1 rounded-control shadow-card sm:h-10 sm:flex-none" disabled={pending || disabled}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Menyimpan…
            </>
          ) : (
            label
          )}
        </Button>
      </div>
    </div>
  );
}

export function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, show: () => setOpen(true), hide: () => setOpen(false) };
}
