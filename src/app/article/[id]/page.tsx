import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateParam } from "@/lib/epaper";
import { getCurrentUser } from "@/lib/session";
import { hasFullAccess } from "@/lib/subscription";
import SaveClipButton from "@/components/SaveClipButton";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
    select: { headline: true, body: true },
  });
  if (!article) return { title: "Article not found" };
  return {
    title: article.headline,
    description: article.body ? article.body.slice(0, 160) : article.headline,
    openGraph: { title: article.headline, type: "article" },
  };
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await prisma.article.findUnique({
    where: { id: params.id },
    include: {
      page: { include: { epaper: { include: { edition: true } } } },
    },
  });
  if (!article) notFound();

  const epaper = article.page.epaper;
  const edition = epaper.edition;
  const dateParam = formatDateParam(epaper.publishDate);
  const dateLabel = epaper.publishDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const user = await getCurrentUser();
  const canDownload = await hasFullAccess(user);
  const savedClip = user
    ? await prisma.clip.findUnique({
        where: { userId_articleId: { userId: user.id, articleId: article.id } },
      })
    : null;

  // Related articles from the same edition
  const related = await prisma.article.findMany({
    where: {
      page: { epaperId: epaper.id },
      NOT: { id: article.id },
    },
    take: 5,
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 text-sm">
        <Link href={`/epaper/${edition.slug}/${dateParam}`} className="text-brand hover:underline">
          ← Back to {edition.name}, {dateLabel} (Page {article.page.pageNumber})
        </Link>
      </div>

      {article.category && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">
          {article.category}
        </p>
      )}
      <h1 className="masthead mb-4 text-3xl font-bold leading-tight text-ink">
        {article.headline}
      </h1>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {edition.name} · {dateLabel} · <span className="font-mono">News ID {article.code}</span>
        </p>
        <div className="flex items-center gap-2">
          {canDownload ? (
            <a
              href={`/api/article/${article.id}/image?download=1`}
              className="rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              ⬇ Download this news
            </a>
          ) : (
            <Link
              href="/subscribe"
              className="rounded border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
              title="Subscribe to download news clippings"
            >
              🔒 Subscribe to download
            </Link>
          )}
          <SaveClipButton articleId={article.id} initialSaved={!!savedClip} />
        </div>
      </div>

      {/* Cropped single-news image extracted from the page */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/article/${article.id}/image`}
        alt={article.headline}
        className="mb-6 w-full rounded border border-neutral-200 bg-white"
      />

      <article className="prose max-w-none whitespace-pre-line text-[1.05rem] leading-relaxed text-neutral-800">
        {article.body || "Full text for this article has not been added yet."}
      </article>

      <div className="mt-8 border-t border-neutral-200 pt-4 text-xs text-neutral-400">
        NewsTrail · {edition.name} edition · {dateLabel} · Page {article.page.pageNumber} · News ID{" "}
        <span className="font-mono">{article.code}</span>
      </div>

      {related.length > 0 && (
        <div className="mt-12 border-t border-neutral-200 pt-6">
          <h2 className="mb-4 text-lg font-semibold">More from this edition</h2>
          <ul className="space-y-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/article/${r.id}`} className="text-brand hover:underline">
                  {r.headline}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
