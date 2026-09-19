"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  name: string;
  priceInPaise: number;
  durationDays: number;
  features: string;
};

export default function SubscribeClient({
  plans,
  isLoggedIn,
}: {
  plans: Plan[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function subscribe(planId: string) {
    setError("");
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/subscribe");
      return;
    }
    setBusyId(planId);
    const res = await fetch("/api/payment/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusyId(null);
      setError(data.error || "Could not start payment");
      return;
    }
    // Redirect to Easebuzz hosted checkout (or mock page)
    window.location.href = data.payUrl;
  }

  return (
    <div>
      {error && (
        <p className="mx-auto mb-6 max-w-xl rounded bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => {
          const highlight = i === 1;
          return (
            <div
              key={p.id}
              className={`relative rounded-xl border bg-white p-7 shadow-card transition-all ${
                highlight ? "border-brand ring-1 ring-brand/30" : "border-line"
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </div>
              )}
              <h3 className="text-base font-semibold text-ink-soft">{p.name}</h3>
              <div className="my-3 flex items-baseline gap-1">
                <span className="num text-4xl font-extrabold text-ink">
                  ₹{(p.priceInPaise / 100).toLocaleString("en-IN")}
                </span>
                <span className="num text-sm text-ink-muted">/ {p.durationDays} days</span>
              </div>
              <p className="mb-6 min-h-[40px] text-sm text-ink-soft">{p.features}</p>
              <button
                onClick={() => subscribe(p.id)}
                disabled={busyId === p.id}
                className={highlight ? "btn-primary w-full py-2.5" : "btn-outline w-full py-2.5"}
              >
                {busyId === p.id ? "Redirecting…" : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>
      {plans.length === 0 && (
        <p className="text-center text-neutral-500">No plans available yet.</p>
      )}
    </div>
  );
}
