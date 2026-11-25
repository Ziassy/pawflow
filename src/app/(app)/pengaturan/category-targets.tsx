"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateCategoryTargets } from "@/server/actions";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui-kit";

type Cat = { id: number; name: string; kind: string; targetBps: number; color: string };

export function CategoryTargets({ categories }: { categories: Cat[] }) {
  const editable = categories.filter((c) => c.kind !== "INCOME");
  const [vals, setVals] = useState<Record<number, string>>(
    Object.fromEntries(editable.map((c) => [c.id, String(c.targetBps / 100).replace(".", ",")])),
  );
  const [pending, start] = useTransition();

  const toBps = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);
  const total = editable.reduce((s, c) => s + (toBps(vals[c.id] ?? "0") || 0), 0);
  const invalid = editable.some((c) => {
    const b = toBps(vals[c.id] ?? "");
    return !Number.isFinite(b) || b < 0 || b > 10000;
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateCategoryTargets(editable.map((c) => ({ id: c.id, targetBps: toBps(vals[c.id]) })));
          if (res.ok) toast.success("Target disimpan");
          else toast.error("error" in res ? res.error : "Gagal");
        });
      }}
    >
      <ul className="divide-y text-sm [&>li]:py-2.5">
        {editable.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2">
            <label htmlFor={`cat-${c.id}`} className="flex items-center gap-2">
              <CategoryIcon name={c.name} color={c.color} size="sm" />
              {c.name}
            </label>
            <span className="flex items-center gap-1">
              <Input
                id={`cat-${c.id}`}
                inputMode="decimal"
                className="h-9 w-20 text-right text-base tabular-nums md:text-sm"
                value={vals[c.id]}
                onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })}
              />
              %
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between py-2 font-medium">
          <span>Total</span>
          <span className={cn("tabular-nums", total !== 10000 && "text-warning")}>
            {(total / 100).toLocaleString("id-ID")}%
          </span>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        Pemasukan tidak punya target. Total tidak harus 100%, tapi akan ditandai jika berbeda.
      </p>
      <Button type="submit" className="h-10 rounded-control" disabled={pending || invalid}>
        Simpan target
      </Button>
    </form>
  );
}
