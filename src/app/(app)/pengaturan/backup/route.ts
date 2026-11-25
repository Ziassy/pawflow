import { requireAuth } from "@/server/auth";
import { exportAll } from "@/server/backup";

// Unduh seluruh data sebagai JSON.
export async function GET() {
  await requireAuth();
  const data = await exportAll();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pawflow-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
