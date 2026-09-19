"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function MockInner() {
  const router = useRouter();
  const params = useSearchParams();
  const txnid = params.get("txnid") || "";
  const [busy, setBusy] = useState(false);

  async function complete(outcome: "success" | "failure") {
    setBusy(true);
    await fetch("/api/payment/mock-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txnid, outcome }),
    });
    router.push(`/payment/status?txnid=${txnid}&ok=${outcome === "success" ? 1 : 0}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-lg border border-neutral-200 bg-white p-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
          Mock gateway (test mode)
        </p>
        <h1 className="masthead mb-2 text-xl font-bold">Simulate Easebuzz payment</h1>
        <p className="mb-6 text-sm text-neutral-500">Transaction {txnid}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => complete("success")}
            disabled={busy}
            className="rounded bg-green-600 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Pay successfully
          </button>
          <button
            onClick={() => complete("failure")}
            disabled={busy}
            className="rounded border border-red-300 py-2.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Fail / cancel
          </button>
        </div>
        <p className="mt-6 text-xs text-neutral-400">
          This screen only appears when EASEBUZZ_ENV=mock. Set real Easebuzz keys to use the live gateway.
        </p>
      </div>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading…</div>}>
      <MockInner />
    </Suspense>
  );
}
