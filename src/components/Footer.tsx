import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="News Trail" className="h-7 w-auto" />
            <p className="mt-2 max-w-sm text-sm text-ink-muted">
              India&apos;s newspaper, delivered digitally. Read every edition, page by page.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
            <Link href="/" className="hover:text-brand">Editions</Link>
            <Link href="/subscribe" className="hover:text-brand">Subscribe</Link>
            <Link href="/search" className="hover:text-brand">Search</Link>
            <Link href="/login" className="hover:text-brand">Login</Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-line pt-6 text-sm text-ink-muted">
          © {new Date().getFullYear()} News Trail India. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
