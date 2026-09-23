"use client";

import { useRouter } from "next/navigation";

type EditionTab = { name: string; slug: string };

export default function EditionFilter({
  editions,
  date,
  edition,
}: {
  editions: EditionTab[];
  date: string; // yyyy-mm-dd or ""
  edition: string; // slug or "all"
}) {
  const router = useRouter();
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  function apply(next: { date?: string; edition?: string }) {
    const d = next.date ?? date;
    const e = next.edition ?? edition;
    const params = new URLSearchParams();
    if (d) params.set("date", d);
    if (e && e !== "all") params.set("edition", e);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const hasFilter = Boolean(date) || (edition && edition !== "all");

  return (
    <div className="card flex flex-wrap items-end gap-4 p-4">
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          value={date}
          max={todayIso}
          onChange={(e) => apply({ date: e.target.value })}
          className="input num w-48"
        />
      </div>

      <div>
        <label className="label">Edition</label>
        <select
          value={edition}
          onChange={(e) => apply({ edition: e.target.value })}
          className="input w-48"
        >
          <option value="all">All editions</option>
          {editions.map((ed) => (
            <option key={ed.slug} value={ed.slug}>
              {ed.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilter && (
        <button onClick={() => router.push("/")} className="btn-outline">
          Clear filters
        </button>
      )}
    </div>
  );
}
