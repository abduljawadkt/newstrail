import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ArticleMapper from "@/components/admin/ArticleMapper";

export const dynamic = "force-dynamic";

export default async function MapPage({
  params,
}: {
  params: { id: string; pageId: string };
}) {
  const page = await prisma.page.findUnique({
    where: { id: params.pageId },
    include: { articles: { orderBy: { createdAt: "asc" } }, epaper: { include: { edition: true } } },
  });
  if (!page || page.epaperId !== params.id) notFound();

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href={`/admin/epaper/${params.id}`} className="text-brand hover:underline">
          ← Back to edition
        </Link>
      </div>
      <h1 className="masthead mb-4 text-xl font-bold">
        Map articles — {page.epaper.edition.name}, Page {page.pageNumber}
      </h1>
      <ArticleMapper
        pageId={page.id}
        epaperId={params.id}
        pageNumber={page.pageNumber}
        fullImage={page.fullImage}
        initialArticles={page.articles.map((a) => ({
          id: a.id,
          code: a.code,
          headline: a.headline,
          category: a.category,
          clipX: a.clipX,
          clipY: a.clipY,
          clipW: a.clipW,
          clipH: a.clipH,
        }))}
      />
    </div>
  );
}
