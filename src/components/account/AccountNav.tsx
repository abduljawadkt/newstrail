"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/profile/password", label: "Change Password", icon: "🔑" },
  { href: "/profile/plan", label: "Current Plan", icon: "🎫" },
  { href: "/profile/history", label: "Subscription History", icon: "🕘" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="rounded-lg border border-neutral-200 bg-white p-2">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium ${
              active ? "bg-brand/10 text-brand" : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <span>{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
