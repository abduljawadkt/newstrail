import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AccountNav from "@/components/account/AccountNav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/profile");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        ← Back to Home
      </Link>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside>
          <AccountNav />
        </aside>
        <section className="rounded-lg border border-neutral-200 bg-white p-6">{children}</section>
      </div>
    </div>
  );
}
