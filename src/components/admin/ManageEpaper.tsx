"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type PageInfo = {
  id: string;
  pageNumber: number;
  thumbImage: string;
  articleCount: number;
};

export default function ManageEpaper({
  epaperId,
  editionName,
  dateLabel,
  status,
  pages,
}: {
  epaperId: string;
  editionName: string;
  dateLabel: string;
  status: string;
  pages: PageInfo[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload() {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg(`Uploading ${files.length} page(s)…`);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("pages", f));
    const res = await fetch(`/api/admin/epaper/${epaperId}/pages`, { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setMsg("Uploaded.");
      setFiles(null);
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error || "Upload failed");
    }
  }

  async function uploadPdf() {
    if (!pdf) return;
    if (replace && !confirm("Replace ALL existing pages with this PDF? Current pages will be deleted.")) return;
    setBusy(true);
    setMsg("Uploading & splitting PDF…");
    const fd = new FormData();
    fd.append("pdf", pdf);
    fd.append("replace", replace ? "true" : "false");
    const res = await fetch(`/api/admin/epaper/${epaperId}/pdf`, { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setMsg(`${replace ? "Replaced with" : "Added"} ${d.created} pages from the PDF.`);
      setPdf(null);
      setReplace(false);
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error || "PDF processing failed");
    }
  }

  async function deletePage(pageId: string) {
    if (!confirm("Delete this page? Remaining pages will be renumbered.")) return;
    setBusy(true);
    await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function autoDetect(replace: boolean) {
    if (
      !confirm(
        replace
          ? "Re-detect articles on ALL pages? Existing article regions will be replaced."
          : "Auto-detect articles on pages that don't have any yet? This uses AI and may take a minute."
      )
    )
      return;
    setBusy(true);
    setMsg("Detecting articles with AI… this can take a minute for a full edition.");
    const res = await fetch(`/api/admin/epaper/${epaperId}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replace }),
    });
    const d = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg(
        `Detected ${d.created} article(s) across ${d.processed} page(s)` +
          (d.errors?.length ? ` — issues on: ${d.errors.join(", ")}` : "")
      );
      router.refresh();
    } else {
      setMsg(d.error || "Detection failed");
    }
  }

  async function togglePublish() {
    setBusy(true);
    const next = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    await fetch(`/api/admin/epaper/${epaperId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this entire edition and its pages? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/admin/epaper/${epaperId}`, { method: "DELETE" });
    router.push("/admin/editions");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="masthead text-2xl font-bold">
            {editionName} — {dateLabel}
          </h1>
          <span
            className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
              status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={togglePublish}
            disabled={busy}
            className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Add pages */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Add pages from PDF</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <button onClick={uploadPdf} disabled={busy || !pdf} className="btn-primary disabled:opacity-50">
              Upload PDF
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace all existing pages
          </label>
          <p className="mt-1 text-xs text-ink-muted">Each PDF page is split into a page automatically.</p>
        </div>

        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Add page images</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm" />
            <button onClick={upload} disabled={busy || !files} className="btn-outline disabled:opacity-50">
              Upload images
            </button>
          </div>
        </div>
        {msg && <p className="text-sm text-ink-muted md:col-span-2">{msg}</p>}
      </div>

      {/* Auto-detect articles */}
      {pages.length > 0 && (
        <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-sm font-semibold">✨ Auto-detect articles (AI)</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Finds each story on every page and makes it clickable & downloadable. You can still
              adjust boxes in the mapper.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => autoDetect(false)} disabled={busy} className="btn-primary disabled:opacity-50">
              Detect articles
            </button>
            <button onClick={() => autoDetect(true)} disabled={busy} className="btn-outline disabled:opacity-50">
              Re-detect all
            </button>
          </div>
        </div>
      )}

      {/* Pages grid */}
      <h2 className="mb-3 text-sm font-semibold">Pages ({pages.length})</h2>
      {pages.length === 0 ? (
        <p className="text-sm text-neutral-500">No pages uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {pages.map((p) => (
            <div key={p.id} className="edition-card group relative block">
              <button
                onClick={() => deletePage(p.id)}
                disabled={busy}
                title="Delete this page"
                className="absolute right-1.5 top-1.5 z-10 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-red-600 opacity-0 shadow transition group-hover:opacity-100 hover:bg-red-50"
              >
                ✕ Delete
              </button>
              <Link href={`/admin/epaper/${epaperId}/map/${p.id}`} title="Map article regions">
                <div className="aspect-[3/4] bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbImage} alt={`Page ${p.pageNumber}`} className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                  <span>Page {p.pageNumber}</span>
                  <span className="text-neutral-500">{p.articleCount} article(s)</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
