import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { from } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="PawFlow — Track your spending, find your flow." width={220} height={220} className="size-52 object-contain sm:size-56" />
          <h1 className="sr-only">PawFlow</h1>
          <p className="-mt-2 text-sm text-muted-foreground">Masukkan password untuk melanjutkan.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <LoginForm from={typeof from === "string" ? from : undefined} />
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Aplikasi pribadi, satu pengguna
        </p>
      </div>
    </main>
  );
}
