import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { formatDateParam } from "@/lib/epaper";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/subscribe`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const epapers = await prisma.ePaper.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishDate: "desc" },
      take: 200,
      include: { edition: true },
    });
    const editionRoutes: MetadataRoute.Sitemap = epapers.map((ep) => ({
      url: `${base}/epaper/${ep.edition.slug}/${formatDateParam(ep.publishDate)}`,
      lastModified: ep.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));
    return [...staticRoutes, ...editionRoutes];
  } catch {
    return staticRoutes;
  }
}
