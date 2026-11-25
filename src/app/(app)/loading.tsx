// Kerangka saat halaman dimuat, supaya terasa instan.
export default function Loading() {
  const block = "animate-pulse rounded-2xl bg-secondary";
  return (
    <div aria-busy="true" aria-label="Memuat" className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded-lg bg-secondary" />
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className={`${block} h-52 lg:col-span-2`} />
        <div className={`${block} h-52`} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
      <div className={`${block} h-72`} />
    </div>
  );
}
