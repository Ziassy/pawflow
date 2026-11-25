import { Sparkles } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[13px] font-medium text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold lg:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ComingSoon({ phase }: { phase: number }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-16 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
        <Sparkles className="size-4" />
      </span>
      <p className="mt-3 text-sm font-medium">Segera hadir</p>
      <p className="mt-1 text-sm text-muted-foreground">Halaman ini dibangun di Fase {phase}.</p>
    </div>
  );
}
