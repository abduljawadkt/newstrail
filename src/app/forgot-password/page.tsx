"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [devUrl, setDevUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    setSent(true);
    if (data.devResetUrl) setDevUrl(data.devResetUrl);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="headline text-3xl">Forgot password</h1>
        <p className="mt-2 text-ink-muted">We&apos;ll send you a link to reset it</p>
      </div>

      {sent ? (
        <div className="card space-y-4 p-7 text-center">
          <p className="text-ink-soft">
            If an account exists for <span className="font-medium">{email}</span>, a password reset
            link has been sent.
          </p>
          {devUrl && (
            <div className="rounded-lg bg-amber-50 p-3 text-left text-sm">
              <p className="mb-1 font-medium text-amber-800">Dev mode (email not configured):</p>
              <a href={devUrl} className="break-all text-brand hover:underline">
                {devUrl}
              </a>
            </div>
          )}
          <Link href="/login" className="btn-outline">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-5 p-7">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-ink-muted">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Login
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
