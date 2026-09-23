"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type ViewerArticle = {
  id: string;
  code: number;
  headline: string;
  clipX: number;
  clipY: number;
  clipW: number;
  clipH: number;
};

export type ViewerPage = {
  id: string;
  pageNumber: number;
  fullImage: string;
  thumbImage: string;
  articles: ViewerArticle[];
};

type EditionTab = { name: string; slug: string };
type Rect = { x: number; y: number; w: number; h: number };

export default function EpaperViewer({
  editionName,
  currentSlug,
  editions,
  dateLabel,
  dateParam,
  isoDate,
  pages,
  canReadAll,
  freePageCount,
  isLoggedIn,
}: {
  editionName: string;
  currentSlug: string;
  editions: EditionTab[];
  dateLabel: string;
  dateParam: string;
  isoDate: string;
  pages: ViewerPage[];
  canReadAll: boolean;
  freePageCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showThumbs, setShowThumbs] = useState(true);
  const [showRegions, setShowRegions] = useState(true);
  const [cropMode, setCropMode] = useState(false);

  // crop drawing state
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  // Keep the toolbar sticky right below the (sticky) site header.
  const [stickyTop, setStickyTop] = useState(0);
  useEffect(() => {
    const measure = () => setStickyTop(document.querySelector("header")?.offsetHeight ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const page = pages[index];
  if (!page) return null;
  const locked = !canReadAll && page.pageNumber > freePageCount;

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  function goEdition(slug: string) {
    if (slug !== currentSlug) router.push(`/epaper/${slug}/${dateParam}`);
  }
  function onDateChange(iso: string) {
    const [y, m, d] = iso.split("-");
    if (y && m && d) router.push(`/epaper/${currentSlug}/${d}-${m}-${y}`);
  }
  function setPage(i: number) {
    setIndex(i);
    setZoom(1);
    setRect(null);
  }

  // --- crop interactions ---
  function rel(e: React.MouseEvent) {
    const b = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  }
  function down(e: React.MouseEvent) {
    if (!cropMode || locked) return;
    const p = rel(e);
    setStart(p);
    setDrawing(true);
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function move(e: React.MouseEvent) {
    if (!drawing || !start) return;
    const p = rel(e);
    setRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  }
  function up() {
    setDrawing(false);
  }
  function downloadCrop() {
    if (!rect || rect.w < 0.01 || rect.h < 0.01) return;
    const q = `x=${rect.x}&y=${rect.y}&w=${rect.w}&h=${rect.h}&download=1`;
    window.location.href = `/api/page/${page.id}/crop?${q}`;
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm border border-neutral-300 hover:bg-neutral-50";

  return (
    <div>
      {/* Edition tabs + date */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2">
          <Link href="/" className="shrink-0 rounded p-1.5 text-neutral-500 hover:bg-neutral-100" title="Home">
            🏠
          </Link>
          <input
            type="date"
            defaultValue={isoDate}
            max={todayIso}
            onChange={(e) => onDateChange(e.target.value)}
            className="shrink-0 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <div className="flex items-center gap-1">
            {editions.map((ed) => (
              <button
                key={ed.slug}
                onClick={() => goEdition(ed.slug)}
                className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium ${
                  ed.slug === currentSlug ? "bg-brand/10 text-brand" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {ed.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar (sticky below the site header) */}
      <div
        className="sticky z-20 border-b border-neutral-200 bg-neutral-50/95 shadow-sm backdrop-blur"
        style={{ top: stickyTop }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(0, index - 1))} disabled={index === 0} className={btn + " disabled:opacity-40"}>
              ←
            </button>
            <select
              value={index}
              onChange={(e) => setPage(Number(e.target.value))}
              className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {pages.map((p, i) => (
                <option key={p.id} value={i}>
                  Page - {p.pageNumber}
                </option>
              ))}
            </select>
            <button
              onClick={() => setPage(Math.min(pages.length - 1, index + 1))}
              disabled={index === pages.length - 1}
              className={btn + " disabled:opacity-40"}
            >
              →
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} className={btn}>
              🔍−
            </button>
            <span className="w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(2.6, +(z + 0.2).toFixed(1)))} className={btn}>
              🔍+
            </button>
            {canReadAll && (
              <button
                onClick={() => {
                  setCropMode((c) => !c);
                  setRect(null);
                }}
                className={btn + (cropMode ? " !border-brand !bg-brand !text-white" : "")}
                title="Crop and download any part of the page"
              >
                ✂ Crop
              </button>
            )}
            <button onClick={() => setShowThumbs((s) => !s)} className={btn}>
              📄 {showThumbs ? "Hide" : "Show"} Pages
            </button>
            {!locked && (
              <a href={page.fullImage} download className={btn + " !border-brand !text-brand"}>
                ⬇ Page
              </a>
            )}
          </div>
        </div>

        {cropMode && (
          <div className="border-t border-amber-200 bg-amber-50">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-sm text-amber-800">
              <span>Drag a box on the page, then</span>
              <button
                onClick={downloadCrop}
                disabled={!rect || rect.w < 0.01}
                className="rounded bg-brand px-3 py-1 font-medium text-white hover:bg-brand-dark disabled:opacity-40"
              >
                ⬇ Download selection
              </button>
              <button onClick={() => setRect(null)} className="rounded border border-neutral-300 px-3 py-1 hover:bg-white">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip (top, horizontal) */}
      {showThumbs && (
        <div className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
            {pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPage(i)}
                className={`relative shrink-0 overflow-hidden rounded border ${
                  i === index ? "border-brand ring-2 ring-brand/40" : "border-neutral-300"
                }`}
                title={`Page ${p.pageNumber}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbImage} alt={`Page ${p.pageNumber}`} className="h-28 w-20 object-cover" />
                <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[10px] text-white">{p.pageNumber}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header line */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <h1 className="masthead text-lg font-bold">
          {editionName} — {dateLabel} · Page {page.pageNumber} of {pages.length}
        </h1>
      </div>

      {/* Page canvas */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        {locked ? (
          <div className="flex flex-col items-center justify-center rounded border border-neutral-200 bg-white p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl text-brand">🔒</div>
            <h3 className="masthead mb-2 text-xl font-bold">This page is for subscribers</h3>
            <p className="mb-6 max-w-md text-sm text-neutral-600">
              Page 1 is free to preview. Subscribe to read all {pages.length} pages and the full archive.
            </p>
            <button
              onClick={() => router.push(isLoggedIn ? "/subscribe" : "/login?callbackUrl=/subscribe")}
              className="rounded bg-brand px-6 py-2.5 font-medium text-white hover:bg-brand-dark"
            >
              {isLoggedIn ? "View subscription plans" : "Login to subscribe"}
            </button>
          </div>
        ) : (
          <div className="overflow-auto rounded border border-neutral-200 bg-neutral-100 p-4">
            <div
              ref={canvasRef}
              onMouseDown={down}
              onMouseMove={move}
              onMouseUp={up}
              onMouseLeave={up}
              className={`relative mx-auto ${cropMode ? "cursor-crosshair select-none" : ""}`}
              style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? "820px" : "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.fullImage} alt={`Page ${page.pageNumber}`} className="block w-full select-none" draggable={false} />

              {/* Article overlays (only when not cropping) */}
              {!cropMode &&
                showRegions &&
                page.articles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/article/${a.id}`)}
                    title={a.headline}
                    className="absolute rounded-sm border-2 border-brand/70 bg-brand/10 transition hover:bg-brand/25"
                    style={{
                      left: `${a.clipX * 100}%`,
                      top: `${a.clipY * 100}%`,
                      width: `${a.clipW * 100}%`,
                      height: `${a.clipH * 100}%`,
                    }}
                  />
                ))}

              {/* Crop selection */}
              {cropMode && rect && (
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
        )}

        {!cropMode && !locked && (
          <div className="mt-2 text-center">
            <button
              onClick={() => setShowRegions((s) => !s)}
              className="text-sm text-brand hover:underline"
            >
              {showRegions ? "Hide" : "Show"} article links
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
