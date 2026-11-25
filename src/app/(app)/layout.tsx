import { Suspense } from "react";
import { cookies } from "next/headers";
import { BottomNav, MobileTopBar, Sidebar } from "@/components/app-nav";
import { NavProgress } from "@/components/nav-progress";
import { SIDEBAR_COOKIE } from "@/components/nav-items";

// Data selalu dari DB terbaru; jangan prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <div className="flex min-h-dvh">
      <Suspense>
        <NavProgress />
      </Suspense>
      <Sidebar defaultCollapsed={collapsed} />
      <div className="min-w-0 flex-1">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 sm:px-6 md:px-8 md:pt-8 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
