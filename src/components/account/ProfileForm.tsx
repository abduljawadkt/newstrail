"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForm({
  initial,
}: {
  initial: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save");
      return;
    }
    setMsg("Profile updated.");
    router.refresh();
  }

  const label = "mb-1 block text-sm font-medium text-neutral-700";
  const star = <span className="text-red-500">*</span>;
  const input = "w-full rounded-md border border-neutral-300 px-3 py-2.5 focus:border-brand focus:outline-none";

  return (
    <form onSubmit={save} className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold">Profile</h1>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}

      <div className="mb-4">
        <label className={label}>{star} Full Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} required />
      </div>
      <div className="mb-4">
        <label className={label}>{star} Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={input}
          required
        />
      </div>
      <div className="mb-6">
        <label className={label}>{star} Mobile Number</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
