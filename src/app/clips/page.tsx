import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/clips");

  const clips = await prisma.clip.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      article: { include: { page: { include: { epaper: { include: { edition: true } } } } } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="masthead mb-6 text-2xl font-bold">My saved clips</h1>
      {clips.length === 0 ? (
        <p className="text-neutral-500">
          You haven&apos;t saved any articles yet. Open an article and tap “Save clip”.
        </p>
      ) : (
        <ul className="space-y-4">
          {clips.map((c) => {
            const ep = c.article.page.epaper;
            return (
              <li key={c.id} className="rounded-md border border-neutral-200 bg-white p-4">
                <Link
                  href={`/article/${c.article.id}`}
                  className="masthead text-lg font-semibold text-ink hover:text-brand"
                >
                  {c.article.headline}
                </Link>
                <p className="mt-1 text-xs text-neutral-400">
                  {ep.edition.name} · {ep.publishDate.toLocaleDateString("en-IN")} · Page{" "}
                  {c.article.page.pageNumber}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
