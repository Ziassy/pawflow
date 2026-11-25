"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { caretAfterFormat, formatTyping, parseRupiahInput } from "@/lib/money";

export function displayAmount(v: number | null) {
  return v === null ? "" : formatTyping(String(v));
}

/**
 * Hook input nominal: titik ribuan muncul langsung saat mengetik (14.200.000),
 * kursor tidak lompat. Singkatan "50rb" / "1,5jt" tetap bisa diketik.
 */
export function useMoneyText(initial: string) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initial);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caret.current !== null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  const onType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatTyping(raw);
    caret.current = caretAfterFormat(raw, e.target.selectionStart ?? raw.length, formatted);
    setText(formatted);
    return formatted;
  };

  return { ref, text, setText, onType };
}

/**
 * Input nominal Rupiah. value null = kosong. onChange dipanggil saat nilai valid berubah.
 */
export function RupiahInput({
  value,
  onChange,
  className,
  invalid,
  ...props
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  invalid?: boolean;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const { ref, text, setText, onType } = useMoneyText(displayAmount(value));
  const [bad, setBad] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  // Sinkron jika nilai dari luar berubah (mis. form di-reset)
  if (value !== lastValue) {
    setLastValue(value);
    if (parseRupiahInput(text) !== value) setText(displayAmount(value));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-medium text-muted-foreground">Rp</span>
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || bad || undefined}
        className={cn("pl-9 tabular-nums", className)}
        onChange={(e) => {
          const t = onType(e);
          const v = parseRupiahInput(t);
          const isBad = Number.isNaN(v);
          setBad(isBad);
          if (!isBad) {
            setLastValue(v);
            onChange(v);
          }
        }}
        onBlur={(e) => {
          const v = parseRupiahInput(text);
          if (!Number.isNaN(v)) setText(displayAmount(v));
          props.onBlur?.(e);
        }}
      />
    </div>
  );
}
