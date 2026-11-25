"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dialogCls } from "@/components/form-dialog";
import { cn } from "@/lib/utils";

type Opts = { title?: string; confirmLabel?: string; destructive?: boolean };

/** const [dialog, confirm] = useConfirm(); if (await confirm("Yakin?")) ... */
export function useConfirm() {
  const [state, setState] = useState<{ message: string } & Opts>();
  const resolver = useRef<(v: boolean) => void>(undefined);

  const confirm = useCallback((message: string, opts: Opts = {}) => {
    setState({ message, ...opts });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setState(undefined);
  };

  // Konfirmasi hapus otomatis bergaya merah
  const danger = !!state && (state.destructive || /hapus/i.test(`${state.confirmLabel ?? ""} ${state.title ?? ""}`));

  const dialog = (
    <Dialog open={!!state} onOpenChange={(open) => !open && close(false)}>
      <DialogContent showCloseButton={false} className={cn(dialogCls, "sm:max-w-sm")}>
        <div className="flex flex-col items-center px-4 pt-6 pb-4 text-center sm:px-6 sm:pt-7 sm:pb-5">
          <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden" />
          <span
            className={cn(
              "grid size-14 place-items-center rounded-full",
              danger ? "bg-negative-soft text-negative" : "bg-accent text-accent-foreground",
            )}
          >
            {danger ? <Trash2 className="size-6" /> : <HelpCircle className="size-6" />}
          </span>
          <DialogHeader className="mt-4 items-center">
            <DialogTitle className="text-lg font-semibold">{state?.title ?? "Konfirmasi"}</DialogTitle>
            <DialogDescription className="text-center leading-relaxed">{state?.message}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex gap-2 border-t bg-secondary/50 px-4 py-3 sm:px-6 sm:py-4">
          <Button variant="outline" className="h-11 flex-1 rounded-control bg-card" onClick={() => close(false)}>
            Batal
          </Button>
          <Button variant={danger ? "destructive" : "default"} className="h-11 flex-1 rounded-control" onClick={() => close(true)} autoFocus>
            {state?.confirmLabel ?? "Ya, lanjut"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return [dialog, confirm] as const;
}
