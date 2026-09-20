export default function Loading() {
  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
      <div className="mb-8 h-8 w-56 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="aspect-[3/4] animate-pulse bg-line/60" />
            <div className="p-3.5">
              <div className="h-4 w-24 animate-pulse rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
