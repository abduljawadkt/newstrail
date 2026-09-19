"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }
    // Auto-login after successful registration
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="headline text-3xl">Create your account</h1>
        <p className="mt-2 text-ink-muted">Join NewsTrail in a few seconds</p>
      </div>
      <form onSubmit={onSubmit} className="card space-y-5 p-7">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label">Full name</label>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Phone (optional)</label>
          <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="input"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
