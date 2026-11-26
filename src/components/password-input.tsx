"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input password dengan tombol mata untuk menampilkan/menyembunyikan isinya.
 * Tombol tetap type="button" agar tidak mengirim form, dan aria-pressed memberi tahu pembaca layar.
 */
export function PasswordInput({ className, ...props }: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        title={visible ? "Sembunyikan password" : "Tampilkan password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
