import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assetSrc } from "@/lib/storage";
import ManageEpaper from "@/components/admin/ManageEpaper";

export const dynamic = "force-dynamic";

export default async function ManageEpaperPage({ params }: { params: { id: string } }) {
  const epaper = await prisma.ePaper.findUnique({
    where: { id: params.id },
    include: {
      edition: true,
      pages: {
        orderBy: { pageNumber: "asc" },
        include: { _count: { select: { articles: true } } },
      },
    },
  });
  if (!epaper) notFound();

  return (
    <ManageEpaper
      epaperId={epaper.id}
      editionName={epaper.edition.name}
      dateLabel={epaper.publishDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
      status={epaper.status}
      pages={epaper.pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        thumbImage: assetSrc(p.thumbImage),
        articleCount: p._count.articles,
      }))}
    />
  );
}
