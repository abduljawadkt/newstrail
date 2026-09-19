"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  id: string;
  code: number;
  headline: string;
  category: string | null;
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
};

type Rect = { x: number; y: number; w: number; h: number };

export default function ArticleMapper({
  pageId,
  epaperId,
  pageNumber,
  fullImage,
  initialArticles,
}: {
  pageId: string;
  epaperId: string;
  pageNumber: number;
  fullImage: string;
  initialArticles: Article[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [headline, setHeadline] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  function relativePoint(e: React.MouseEvent) {
    const el = containerRef.current!;
    const bounds = el.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width;
    const y = (e.clientY - bounds.top) / bounds.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }

  function onMouseDown(e: React.MouseEvent) {
    const p = relativePoint(e);
    setStart(p);
    setDrawing(true);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drawing || !start) return;
    const p = relativePoint(e);
    setRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }
  function onMouseUp() {
    setDrawing(false);
  }

  async function save() {
    if (!rect || rect.w < 0.01 || rect.h < 0.01) {
      alert("Draw a box on the page first.");
      return;
    }
    if (!headline.trim()) {
      alert("Enter a headline.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/pages/${pageId}/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: headline.trim(),
        body,
        category: category.trim() || null,
        clipX: rect.x,
        clipY: rect.y,
        clipW: rect.w,
        clipH: rect.h,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setArticles((a) => [...a, d.article]);
      setRect(null);
      setHeadline("");
      setCategory("");
      setBody("");
      router.refresh();
    } else {
      alert("Could not save article.");
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this article region?")) return;
    await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    setArticles((a) => a.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Canvas */}
      <div>
        <p className="mb-2 text-sm text-neutral-500">
          Click and drag on the page to draw an article box, then fill the details on the right.
        </p>
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="relative w-full cursor-crosshair select-none overflow-hidden rounded border border-neutral-300"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullImage} alt={`Page ${pageNumber}`} className="block w-full" draggable={false} />

          {/* existing regions */}
          {articles.map((a) => (
            <div
              key={a.id}
              className="absolute border-2 border-green-500/80 bg-green-400/10"
              style={{
                left: `${a.clipX * 100}%`,
                top: `${a.clipY * 100}%`,
                width: `${a.clipW * 100}%`,
                height: `${a.clipH * 100}%`,
              }}
            >
              <span className="absolute left-0 top-0 max-w-full truncate bg-green-600 px-1 text-[10px] text-white">
                {a.headline}
              </span>
            </div>
          ))}

          {/* current drawing */}
          {rect && (
            <div
              className="absolute border-2 border-brand bg-brand/15"
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.w * 100}%`,
                height: `${rect.h * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Form + list */}
      <div>
        <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">New article region</h2>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="mb-3 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Headline"
          />
          <label className="mb-1 block text-xs font-medium text-neutral-600">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-3 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="e.g. Nation"
          />
          <label className="mb-1 block text-xs font-medium text-neutral-600">Body text</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mb-3 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Full article text (optional)"
          />
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded bg-brand py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save article"}
          </button>
        </div>

        <h2 className="mb-2 text-sm font-semibold">Articles on this page ({articles.length})</h2>
        <ul className="space-y-2">
          {articles.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded border border-neutral-200 bg-white p-2 text-sm"
            >
              <div>
                <p className="font-medium">{a.headline}</p>
                <p className="text-xs text-neutral-500">
                  <span className="font-mono">ID {a.code}</span>
                  {a.category ? ` · ${a.category}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <a
                  href={`/api/article/${a.id}/image?download=1`}
                  className="text-xs text-brand hover:underline"
                >
                  Download
                </a>
                <button onClick={() => del(a.id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
          {articles.length === 0 && <li className="text-sm text-neutral-500">None yet.</li>}
        </ul>
      </div>
    </div>
  );
}
