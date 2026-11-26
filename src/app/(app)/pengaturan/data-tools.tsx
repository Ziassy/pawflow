"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, DatabaseBackup, Download, Loader2, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/form-dialog";
import { cn } from "@/lib/utils";
import { restoreBackup } from "@/server/data-actions";

/** Area drag & drop file. */
function DropZone({ accept, multiple, onFiles, children }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        over ? "border-primary bg-accent" : "border-border bg-secondary/40 hover:border-primary/50 hover:bg-accent/50",
      )}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

export function BackupRestore() {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl bg-secondary/50 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-135 from-hero-from to-hero-to text-white shadow-card">
          <DatabaseBackup className="size-5" />
        </span>
        <div className="flex-1 text-sm">
          <div className="font-semibold">Backup data akunmu</div>
          <div className="text-muted-foreground">Satu file JSON berisi semua data akun ini. Simpan di tempat aman.</div>
        </div>
        <a href="/pengaturan/backup" className={cn(buttonVariants(), "h-10 rounded-control")} download>
          <Download className="size-4" /> Unduh backup
        </a>
      </div>

      <DropZone accept=".json,application/json" onFiles={(f) => f[0] && (setFile(f[0]), setOpen(true), setWord(""))}>
        <span className="grid size-11 place-items-center rounded-2xl bg-card text-negative shadow-card">
          <RotateCcw className="size-5" />
        </span>
        <span className="text-sm font-medium">Pulihkan dari file backup</span>
        <span className="text-xs text-muted-foreground">Tarik file .json ke sini. Semua data akunmu akan diganti.</span>
      </DropZone>

      <FormDialog
        icon={AlertTriangle}
        tone="danger"
        title="Pulihkan dari backup?"
        description={file?.name}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setFile(null);
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) return;
            const fd = new FormData();
            fd.set("file", file);
            fd.set("confirm", word);
            start(async () => {
              const r = await restoreBackup(fd);
              if (!r.ok) {
                toast.error(r.error);
                return;
              }
              const total = Object.values(r.counts).reduce((s, n) => s + n, 0);
              toast.success(`Dipulihkan: ${total} baris dari backup ${new Date(r.exportedAt).toLocaleString("id-ID")}`);
              setOpen(false);
              setFile(null);
            });
          }}
        >
          <div className="rounded-2xl bg-negative-soft p-4 text-sm text-negative">
            Semua data akunmu saat ini (transaksi, hutang, investasi, target, pengaturan) akan <b>dihapus dan diganti</b> dengan isi file. Unduh backup data
            sekarang dulu jika ragu.
          </div>
          <div className="space-y-1.5">
            <label htmlFor="restore-confirm" className="text-[13px] font-medium text-muted-foreground">
              Ketik <b className="text-foreground">PULIHKAN</b> untuk konfirmasi
            </label>
            <Input id="restore-confirm" autoComplete="off" className="h-10 rounded-control" value={word} onChange={(e) => setWord(e.target.value)} />
          </div>
          <div className="-mx-4 -mb-4 mt-2 flex gap-2 border-t bg-secondary/50 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-4">
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-control bg-card" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="destructive" className="h-11 flex-1 rounded-control" disabled={pending || word !== "PULIHKAN"}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Pulihkan
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
