"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RESOURCE_CATEGORIES, SEMESTERS } from "@/lib/constants";

const SORTS = [
  ["newest", "Newest"],
  ["popular", "Popular"],
  ["downloads", "Most Downloaded"],
  ["rating", "Highest Rated"],
] as const;

export function ResourceFilters({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "";

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => pushParams({ category: "" })}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            activeCategory === "" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          All
        </button>
        {RESOURCE_CATEGORIES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => pushParams({ category: value })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              activeCategory === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Secondary filters + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={searchParams.get("year") ?? ""}
          onChange={(e) => pushParams({ year: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("semester") ?? ""}
          onChange={(e) => pushParams({ semester: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All semesters</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("pricing") ?? ""}
          onChange={(e) => pushParams({ pricing: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Free & Paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </select>

        <select
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => pushParams({ sort: e.target.value })}
          className="ml-auto h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
