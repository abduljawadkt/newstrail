"use client";

import { useState } from "react";

export default function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (form.newPassword !== form.confirm) {
      setError("New password and confirmation do not match");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not change password");
      return;
    }
    setMsg("Password changed successfully.");
    setForm({ currentPassword: "", newPassword: "", confirm: "" });
  }

  const label = "mb-1 block text-sm font-medium text-neutral-700";
  const input = "w-full rounded-md border border-neutral-300 px-3 py-2.5 focus:border-brand focus:outline-none";

  return (
    <form onSubmit={submit} className="max-w-xl">
      <h1 className="mb-6 text-xl font-bold">Change Password</h1>
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {msg && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}

      <div className="mb-4">
        <label className={label}>Current Password</label>
        <input
          type="password"
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
          className={input}
          required
        />
      </div>
      <div className="mb-4">
        <label className={label}>New Password</label>
        <input
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          className={input}
          minLength={6}
          required
        />
      </div>
      <div className="mb-6">
        <label className={label}>Confirm New Password</label>
        <input
          type="password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          className={input}
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
