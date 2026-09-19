"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  priceInPaise: number;
  durationDays: number;
  features: string;
  active: boolean;
};

export default function PlansAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({ name: "", priceInRupees: "", durationDays: "", features: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/plans");
    const d = await r.json();
    setPlans(d.plans ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ name: "", priceInRupees: "", durationDays: "", features: "" });
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  }

  async function toggleActive(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="masthead mb-6 text-2xl font-bold">Subscription plans</h1>

      <div className="mb-8 overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="num px-4 py-2">₹{(p.priceInPaise / 100).toLocaleString("en-IN")}</td>
                <td className="num px-4 py-2">{p.durationDays} days</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`rounded px-2 py-0.5 text-xs ${
                      p.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No plans yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="max-w-lg space-y-4 rounded-md border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold">Add a plan</h2>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Price (₹)</label>
            <input
              required
              type="number"
              min="1"
              value={form.priceInRupees}
              onChange={(e) => setForm({ ...form, priceInRupees: e.target.value })}
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Duration (days)</label>
            <input
              required
              type="number"
              min="1"
              value={form.durationDays}
              onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
              className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Features</label>
          <input
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Short description"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add plan"}
        </button>
      </form>
    </div>
  );
}
