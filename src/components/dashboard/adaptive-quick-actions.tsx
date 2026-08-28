"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type AdaptiveAction = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  tone?: "primary" | "default";
};

function trackAction(actionId: string, href: string, label: string) {
  try {
    void fetch("/api/dashboard/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actionId, href, label }),
      keepalive: true,
    });
  } catch {
    // Navigation must never be blocked by analytics tracking.
  }
}

export function AdaptiveQuickActions({ actions }: { actions: AdaptiveAction[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => trackAction(action.id, action.href, action.label)}
            className={
              action.tone === "primary"
                ? "group rounded-2xl border border-primary/20 bg-primary p-3 text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary))] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:p-4"
                : "group rounded-2xl border bg-card p-3 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:translate-y-0 sm:p-4"
            }
          >
            <span className={action.tone === "primary" ? "flex h-9 w-9 items-center justify-center rounded-xl bg-white/15" : "flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="mt-2 block line-clamp-2 text-[11px] font-semibold leading-4 sm:text-sm sm:leading-5">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
