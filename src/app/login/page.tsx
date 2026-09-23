"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand to-brand-dark p-12 text-white md:flex md:flex-col md:justify-between">
      {/* subtle newspaper-column texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 84px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="NewsTrail" className="relative h-9 w-auto brightness-0 invert" />

      <div className="relative">
        <h2 className="headline text-4xl leading-tight text-white md:text-[2.75rem]">
          Your newspaper,
          <br />
          delivered digitally.
        </h2>
        <p className="mt-4 max-w-sm leading-relaxed text-white/85">
          Read every edition page by page, clip and download stories, and browse the full
          archive — anywhere, anytime.
        </p>
        <ul className="mt-8 space-y-3 text-white/90">
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm">✓</span>
            Every edition, every day
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm">✓</span>
            Zoom, clip &amp; download any story
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm">✓</span>
            Search the archive by date
          </li>
        </ul>
      </div>

      <p className="relative text-sm text-white/60">© {new Date().getFullYear()} NewsTrail India</p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Sign in</p>
      <h1 className="headline text-3xl text-ink md:text-4xl">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Access today&apos;s edition and the full archive.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to NewsTrail?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 overflow-hidden md:my-10 md:min-h-[560px] md:grid-cols-2 md:rounded-2xl md:border md:border-line md:shadow-card-hover">
      <BrandPanel />
      <div className="flex items-center justify-center bg-white px-6 py-14 sm:px-12">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NewsTrail" className="mx-auto mb-10 h-8 w-auto md:hidden" />
          <Suspense fallback={<div className="text-ink-muted">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
