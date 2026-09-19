"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SaveClipButton({
  articleId,
  initialSaved,
}: {
  articleId: string;
  initialSaved: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!session?.user) {
      router.push("/login?callbackUrl=/article/" + articleId);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/clips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setSaved(d.saved);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
        saved
          ? "border-brand bg-brand text-white hover:bg-brand-dark"
          : "border-neutral-300 text-neutral-700 hover:border-brand hover:text-brand"
      }`}
    >
      {saved ? "★ Saved" : "☆ Save clip"}
    </button>
  );
}
