import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand">404</p>
      <h1 className="headline mb-3 text-3xl">Page not found</h1>
      <p className="mb-8 text-ink-soft">
        The page or edition you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary px-5 py-2.5">
          Back to editions
        </Link>
        <Link href="/search" className="btn-outline px-5 py-2.5">
          Search
        </Link>
      </div>
    </div>
  );
}
