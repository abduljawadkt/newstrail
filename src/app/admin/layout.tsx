import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/editions", label: "Editions" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/login?callbackUrl=/admin");

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <aside className="w-52 shrink-0">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Admin
        </div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded px-3 py-2 text-sm text-neutral-700 hover:bg-brand/10 hover:text-brand"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
