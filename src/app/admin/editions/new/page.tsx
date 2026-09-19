"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Edition = { id: string; name: string; slug: string };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function NewEditionPage() {
  const router = useRouter();
  const [editions, setEditions] = useState<Edition[]>([]);
  const [editionId, setEditionId] = useState("");
  const [newEditionName, setNewEditionName] = useState("");

  // Default publish date = tomorrow; allow back to 3 months ago.
  const { defaultDate, minDate, maxDate } = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const min = new Date(today);
    min.setMonth(today.getMonth() - 3);
    const max = new Date(today);
    max.setDate(today.getDate() + 7); // allow up to a week ahead for scheduling
    return { defaultDate: iso(tomorrow), minDate: iso(min), maxDate: iso(max) };
  }, []);

  const [date, setDate] = useState(defaultDate);
  const [mode, setMode] = useState<"pdf" | "images">("pdf");
  const [pdf, setPdf] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/editions")
      .then((r) => r.json())
      .then((d) => {
        setEditions(d.editions ?? []);
        if (d.editions?.[0]) setEditionId(d.editions[0].id);
      })
      .catch(() => {});
  }, []);

  async function ensureEdition(): Promise<string | null> {
    if (editionId === "__new") {
      if (!newEditionName.trim()) {
        setError("Enter a name for the new edition");
        return null;
      }
      const res = await fetch("/api/admin/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEditionName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create edition");
        return null;
      }
      return data.edition.id;
    }
    return editionId;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    try {
      const edId = await ensureEdition();
      if (!edId) return;

      const epRes = await fetch("/api/admin/epaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId: edId, date }),
      });
      const epData = await epRes.json();
      if (!epRes.ok) {
        setError(epData.error || "Could not create e-paper");
        return;
      }
      const epaperId = epData.epaper.id;

      if (mode === "pdf") {
        if (!pdf) {
          setError("Choose a PDF to upload");
          return;
        }
        const fd = new FormData();
        fd.append("pdf", pdf);
        setMsg("Uploading & splitting PDF… this can take a moment for large files.");
        const upRes = await fetch(`/api/admin/epaper/${epaperId}/pdf`, { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) {
          setError(upData.error || "PDF processing failed");
          return;
        }
        setMsg(`Created ${upData.created} pages from the PDF.`);
      } else if (files && files.length > 0) {
        const fd = new FormData();
        Array.from(files).forEach((f) => fd.append("pages", f));
        setMsg(`Uploading ${files.length} page image(s)…`);
        const upRes = await fetch(`/api/admin/epaper/${epaperId}/pages`, { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) {
          setError(upData.error || "Upload failed");
          return;
        }
      }

      router.push(`/admin/epaper/${epaperId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="masthead mb-6 text-2xl font-bold">Upload edition</h1>
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {msg && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</p>}

        <div>
          <label className="label">Edition</label>
          <select value={editionId} onChange={(e) => setEditionId(e.target.value)} className="input">
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name}
              </option>
            ))}
            <option value="__new">+ New edition…</option>
          </select>
        </div>

        {editionId === "__new" && (
          <div>
            <label className="label">New edition name</label>
            <input
              value={newEditionName}
              onChange={(e) => setNewEditionName(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="input"
            />
          </div>
        )}

        <div>
          <label className="label">Publish date</label>
          <input
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="input num w-56"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Defaults to tomorrow. You can pick any date from the last 3 months up to a week ahead.
          </p>
        </div>

        {/* Upload method toggle */}
        <div>
          <label className="label">Upload method</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("pdf")}
              className={mode === "pdf" ? "btn-primary" : "btn-outline"}
            >
              📄 Full PDF (auto-split)
            </button>
            <button
              type="button"
              onClick={() => setMode("images")}
              className={mode === "images" ? "btn-primary" : "btn-outline"}
            >
              🖼 Page images
            </button>
          </div>
        </div>

        {mode === "pdf" ? (
          <div>
            <label className="label">Newspaper PDF</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Upload the complete edition PDF — each page becomes a page image automatically, with
              thumbnails generated.
            </p>
          </div>
        ) : (
          <div>
            <label className="label">Page images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-ink-muted">Select page images in order (page 1 first).</p>
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5">
          {busy ? "Working…" : "Create edition"}
        </button>
      </form>
    </div>
  );
}
