"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useSubmit } from "@/components/form-dialog";
import { Panel, Progress } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { addResolution, deleteResolution, setResolutionDone } from "@/server/finance-actions";

export function Resolutions({ year, items }: { year: number; items: { id: number; text: string; done: boolean }[] }) {
  const [text, setText] = useState("");
  const { pending, submit } = useSubmit();
  const done = items.filter((i) => i.done).length;
  return (
    <Panel
      title={`Resolusi ${year}`}
      description={items.length ? `${done} dari ${items.length} tercapai` : "Tulis apa yang ingin dicapai tahun ini."}
      action={
        <div className="flex">
          <Link href={`/target?tahun=${year - 1}`} aria-label="Tahun sebelumnya" className="grid size-9 place-items-center rounded-lg hover:bg-secondary sm:size-8">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={`/target?tahun=${year + 1}`} aria-label="Tahun berikutnya" className="grid size-9 place-items-center rounded-lg hover:bg-secondary sm:size-8">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      }
    >
      {items.length > 0 && <Progress value={done / items.length} color="var(--positive)" className="mb-4" label="Resolusi tercapai" />}
      <ul className="space-y-1">
        {items.map((r) => (
          <li key={r.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60">
            <Checkbox checked={r.done} aria-label={r.text} className="size-5" onCheckedChange={(v) => submit(() => setResolutionDone(r.id, !!v))} />
            <span className={cn("flex-1 text-sm", r.done && "text-muted-foreground line-through")}>{r.text}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Hapus" className="opacity-60 group-hover:opacity-100" onClick={() => submit(() => deleteResolution(r.id))}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(() => addResolution(year, text), undefined, () => setText(""));
        }}
      >
        <Input aria-label="Resolusi baru" placeholder="mis. Lunas semua kartu kredit" className="h-10 rounded-control" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" className="h-10 rounded-control" disabled={pending || !text.trim()}>
          Tambah
        </Button>
      </form>
    </Panel>
  );
}
