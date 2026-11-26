"use client";

import { Target } from "lucide-react";
import { Dropdown } from "@/components/dropdown";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RupiahInput } from "@/components/rupiah-input";
import { NameAutocomplete } from "@/components/name-autocomplete";
import { zTransactionInput, type TransactionInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { categoryTheme } from "@/lib/category-theme";

export type CategoryOption = { id: number; name: string; kind: string; color: string };
export type Suggestion = { name: string; categoryId: number; amount: number | null };
export type GoalOption = { id: number; name: string };

type FormIn = z.input<typeof zTransactionInput>;

export function TransactionForm({
  categories,
  suggestions = [],
  initial,
  submitLabel = "Simpan",
  compact = false,
  onSubmit,
  onCancel,
  extraActions,
  goals = [],
}: {
  goals?: GoalOption[];
  categories: CategoryOption[];
  suggestions?: Suggestion[];
  initial?: Partial<TransactionInput>;
  submitLabel?: string;
  compact?: boolean;
  /** Kembalikan true jika berhasil -> form di-reset (mode tambah). */
  onSubmit: (data: TransactionInput) => Promise<boolean>;
  onCancel?: () => void;
  extraActions?: React.ReactNode;
}) {
  const id = useId();
  const defaults: FormIn = {
    name: initial?.name ?? "",
    categoryId: initial?.categoryId ?? 0,
    amount: initial?.amount ?? null,
    isPaid: initial?.isPaid ?? false,
    note: initial?.note ?? "",
    goalId: initial?.goalId ?? null,
  };
  const form = useForm<FormIn, unknown, TransactionInput>({
    resolver: zodResolver(zTransactionInput),
    defaultValues: defaults,
  });
  const { register, control, handleSubmit, formState, setValue, getValues, reset, setFocus } = form;
  const err = formState.errors;

  const submit = handleSubmit(async (data) => {
    const ok = await onSubmit(data);
    if (ok && !initial) {
      reset({ ...defaults, categoryId: data.categoryId });
      setFocus("name");
    }
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className={cn("grid gap-3", compact ? "grid-cols-1 sm:grid-cols-[1fr_11rem]" : "")}>
        <div className="space-y-1.5">
          {!compact && <Label htmlFor={`${id}-name`}>Nama</Label>}
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <NameAutocomplete
                value={field.value ?? ""}
                onChange={field.onChange}
                suggestions={suggestions}
                categories={categories}
                onPick={(sg) => {
                  field.onChange(sg.name);
                  // Isi kategori & nominal dari saran jika belum diisi
                  if (!getValues("categoryId")) setValue("categoryId", sg.categoryId, { shouldValidate: true });
                  if (getValues("amount") === null && sg.amount !== null) setValue("amount", sg.amount);
                }}
                inputProps={{
                  id: `${id}-name`,
                  ref: field.ref,
                  name: field.name,
                  onBlur: field.onBlur,
                  placeholder: "Nama transaksi",
                  className: "h-10 text-base md:text-sm",
                  "aria-invalid": !!err.name || undefined,
                }}
              />
            )}
          />
        </div>
        <div className="space-y-1.5">
          {!compact && <Label htmlFor={`${id}-amount`}>Nominal</Label>}
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <RupiahInput
                id={`${id}-amount`}
                placeholder="0"
                className="h-10 text-base md:text-sm"
                value={field.value ?? null}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={!!err.amount}
              />
            )}
          />
        </div>
      </div>

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Kategori" className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const active = field.value === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => field.onChange(c.id)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span className="size-2 rounded-full" style={{ background: categoryTheme(c.name, c.color).color }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      />

      {!compact && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-note`}>Catatan / koreksi</Label>
          <Input id={`${id}-note`} className="h-10 text-base md:text-sm" {...register("note")} />
        </div>
      )}
      {!compact && goals.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-goal`}>Target (opsional)</Label>
          <Controller
            control={control}
            name="goalId"
            render={({ field }) => (
              <Dropdown
                id={`${id}-goal`}
                emptyLabel="Tidak ditautkan"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : null)}
                options={goals.map((g) => ({ value: String(g.id), label: g.name, icon: Target }))}
              />
            )}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Controller
            control={control}
            name="isPaid"
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} className="size-5" />
            )}
          />
          Sudah dibayar
        </label>
        <div className="flex gap-2">
          {extraActions}
          {onCancel && (
            <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
              Batal
            </Button>
          )}
          <Button write type="submit" className="h-10 min-w-24 rounded-control" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Menyimpan…" : submitLabel}
          </Button>
        </div>
      </div>

      {(err.name || err.categoryId || err.amount) && (
        <p role="alert" className="text-sm text-destructive">
          {err.name?.message ?? err.categoryId?.message ?? err.amount?.message}
        </p>
      )}
    </form>
  );
}
