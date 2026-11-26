import { CalendarClock, Lock } from "lucide-react";
import { formatDay } from "@/lib/format";
import type { SessionUser } from "@/lib/session-user";
import { daysLeft } from "@/lib/subscription";
import { cn } from "@/lib/utils";

/** Peringatan di atas setiap halaman: langganan berakhir (read-only) atau tinggal <= 7 hari. */
export function SubscriptionBanner({ user }: { user: SessionUser }) {
  if (user.isAdmin || !user.subscriptionUntil) return null;
  const left = daysLeft(new Date(`${user.subscriptionUntil}T00:00:00Z`)) ?? 0;
  if (!user.readOnly && left > 7) return null;
  const until = formatDay(user.subscriptionUntil);
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 border-b px-4 py-2.5 text-sm sm:px-6 md:px-8 lg:px-10",
        // Teks tetap text-foreground agar kontras aman; warna hanya di latar & ikon
        user.readOnly ? "bg-negative-soft" : "bg-warning-soft",
      )}
    >
      {user.readOnly ? <Lock className="mt-0.5 size-4 shrink-0 text-negative" /> : <CalendarClock className="mt-0.5 size-4 shrink-0 text-warning" />}
      <p>
        {user.readOnly ? (
          <>
            <b>Masa langganan berakhir {until}.</b> Data hanya bisa dilihat. Hubungi admin untuk memperpanjang.
          </>
        ) : (
          <>
            Langganan berakhir <b>{until}</b> ({left === 1 ? "hari ini hari terakhir" : `${left} hari lagi`}). Hubungi admin untuk memperpanjang.
          </>
        )}
      </p>
    </div>
  );
}
