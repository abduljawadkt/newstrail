"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 w-full border-b border-line bg-white/90 backdrop-blur">
      {/* Main row */}
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="hidden w-56 text-xs font-medium uppercase tracking-wide text-ink-muted md:block">
          {today}
        </div>

        <Link href="/" className="shrink-0" aria-label="NewsTrail home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NewsTrail" className="h-8 w-auto md:h-9" />
        </Link>

        <nav className="flex w-56 items-center justify-end gap-2.5 text-sm">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="font-medium text-ink-soft hover:text-brand">
                  Admin
                </Link>
              )}
              <Link href="/clips" className="hidden font-medium text-ink-soft hover:text-brand sm:inline">
                Clips
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:border-brand"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {(user.name?.[0] ?? "U").toUpperCase()}
                </span>
                <span className="font-medium text-ink-soft">{user.name?.split(" ")[0] ?? "Account"}</span>
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-ink-soft hover:text-brand">
                Login
              </Link>
              <Link href="/subscribe" className="btn-primary">
                Subscribe
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Secondary bar */}
      <div className="border-t border-line bg-paper/60">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <nav className="flex items-center gap-4 text-sm font-medium text-ink-soft">
            <Link href="/" className="hover:text-brand">
              Editions
            </Link>
            <Link href="/subscribe" className="hover:text-brand">
              Plans
            </Link>
          </nav>
          <form onSubmit={onSearch} className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">⌕</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search news…"
                className="w-44 rounded-full border border-line bg-white py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 sm:w-72"
              />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
