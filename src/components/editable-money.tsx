"use client";

import { useState, useTransition } from "react";
import { displayAmount, useMoneyText } from "@/components/rupiah-input";
import { toast } from "sonner";
import { parseRupiahInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/actions";

const show = displayAmount;

/**
 * Sel nominal di grid: ketik lalu tinggalkan (blur/Enter) untuk simpan.
 * Kosong = hapus nilai (tidak dianggap 0).
 */
export function EditableMoneyCell({
  value,
  onSave,
  label,
  className,
  placeholder = "–",
  allowNegative = false,
}: {
  value: number | null;
  onSave: (v: number | null) => Promise<ActionResult>;
  label: string;
  className?: string;
  placeholder?: string;
  allowNegative?: boolean;
}) {
  const { ref, text, setText, onType } = useMoneyText(show(value));
  const [last, setLast] = useState(value);
  const [pending, start] = useTransition();
  if (value !== last) {
    setLast(value);
    setText(show(value));
  }

  const commit = () => {
    const v = parseRupiahInput(text);
    if (Number.isNaN(v) || (!allowNegative && v !== null && v < 0)) {
      toast.error(`Nominal tidak valid: "${text}"`);
      setText(show(value));
      return;
    }
    if (v === value) {
      setText(show(value));
      return;
    }
    start(async () => {
      const res = await onSave(v);
      if (!res.ok) {
        toast.error("error" in res ? res.error : "Gagal menyimpan");
        setText(show(value));
      }
    });
  };

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      disabled={pending}
      ref={ref}
      onChange={onType}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setText(show(value));
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "h-9 w-full min-w-20 rounded-lg border border-transparent bg-transparent px-2 text-right text-sm tabular-nums transition-colors md:min-w-24",
        "placeholder:text-muted-foreground/50 hover:border-border focus:border-ring focus:bg-card focus:outline-none focus:ring-3 focus:ring-ring/25",
        pending && "opacity-50",
        className,
      )}
    />
  );
}
