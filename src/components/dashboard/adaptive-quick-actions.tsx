"use client";

import Link from "next/link";
import {
  Bell, BookOpen, Building2, ClipboardList, Clock3, DollarSign, Download, Flame, FolderOpen, Grid2X2, Headphones, Heart, Search, Settings2, ShoppingBag, Upload, UserPlus, Wallet,
} from "lucide-react";


export type AdaptiveIconName =
  | "Bell"
  | "BookOpen"
  | "ClipboardList"
  | "Clock3"
  | "DollarSign"
  | "Grid2X2"
  | "Heart"
  | "Search"
  | "Settings2"
  | "ShoppingBag"
  | "Upload"
  | "Wallet"
  | "Building2"
  | "Flame"
  | "Headphones"
  | "UserPlus"
  | "FolderOpen"
  | "Download";

const ICONS: Record<AdaptiveIconName, typeof Search> = {
  Bell,
  BookOpen,
  ClipboardList,
  Clock3,
  DollarSign,
  Grid2X2,
  Heart,
  Search,
  Settings2,
  ShoppingBag,
  Upload,
  Wallet,
  Building2,
  Flame,
  Headphones,
  UserPlus,
  FolderOpen,
  Download,
};

export type AdaptiveAction = {
  id: string;
  label: string;
  href: string;
  icon: AdaptiveIconName;
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
  const toneByAction: Record<string, string> = {
    browse: "border-sky-200 bg-gradient-to-br from-sky-100 via-sky-50 to-white text-sky-950 dark:border-sky-800/70 dark:from-sky-950/70 dark:via-sky-900/45 dark:to-sky-950/20 dark:text-sky-50",
    purchases: "border-violet-200 bg-gradient-to-br from-violet-100 via-violet-50 to-white text-violet-950 dark:border-violet-800/70 dark:from-violet-950/70 dark:via-violet-900/45 dark:to-violet-950/20 dark:text-violet-50",
    saved: "border-rose-200 bg-gradient-to-br from-rose-100 via-rose-50 to-white text-rose-950 dark:border-rose-800/70 dark:from-rose-950/70 dark:via-rose-900/45 dark:to-rose-950/20 dark:text-rose-50",
    requests: "border-amber-200 bg-gradient-to-br from-amber-100 via-amber-50 to-white text-amber-950 dark:border-amber-800/70 dark:from-amber-950/70 dark:via-amber-900/45 dark:to-amber-950/20 dark:text-amber-50",
    notifications: "border-orange-200 bg-gradient-to-br from-orange-100 via-orange-50 to-white text-orange-950 dark:border-orange-800/70 dark:from-orange-950/70 dark:via-orange-900/45 dark:to-orange-950/20 dark:text-orange-50",
    tools: "border-teal-200 bg-gradient-to-br from-teal-100 via-teal-50 to-white text-teal-950 dark:border-teal-800/70 dark:from-teal-950/70 dark:via-teal-900/45 dark:to-teal-950/20 dark:text-teal-50",
    history: "border-indigo-200 bg-gradient-to-br from-indigo-100 via-indigo-50 to-white text-indigo-950 dark:border-indigo-800/70 dark:from-indigo-950/70 dark:via-indigo-900/45 dark:to-indigo-950/20 dark:text-indigo-50",
    courses: "border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950 dark:border-emerald-800/70 dark:from-emerald-950/70 dark:via-emerald-900/45 dark:to-emerald-950/20 dark:text-emerald-50",
    account: "border-slate-200 bg-gradient-to-br from-slate-100 via-slate-50 to-white text-slate-950 dark:border-slate-700 dark:from-slate-900 dark:via-slate-800/70 dark:to-slate-900/40 dark:text-slate-50",
    upload: "border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-white text-emerald-950 dark:border-emerald-800/70 dark:from-emerald-950/70 dark:via-emerald-900/45 dark:to-emerald-950/20 dark:text-emerald-50",
    sales: "border-sky-200 bg-gradient-to-br from-sky-100 via-sky-50 to-white text-sky-950 dark:border-sky-800/70 dark:from-sky-950/70 dark:via-sky-900/45 dark:to-sky-950/20 dark:text-sky-50",
    "payment-settings": "border-amber-200 bg-gradient-to-br from-amber-100 via-amber-50 to-white text-amber-950 dark:border-amber-800/70 dark:from-amber-950/70 dark:via-amber-900/45 dark:to-amber-950/20 dark:text-amber-50",
    "pending-approval": "border-orange-200 bg-gradient-to-br from-orange-100 via-orange-50 to-white text-orange-950 dark:border-orange-800/70 dark:from-orange-950/70 dark:via-orange-900/45 dark:to-orange-950/20 dark:text-orange-50",
    "my-resources": "border-cyan-200 bg-gradient-to-br from-cyan-100 via-cyan-50 to-white text-cyan-950 dark:border-cyan-800/70 dark:from-cyan-950/70 dark:via-cyan-900/45 dark:to-cyan-950/20 dark:text-cyan-50",
    "resource-requests": "border-fuchsia-200 bg-gradient-to-br from-fuchsia-100 via-fuchsia-50 to-white text-fuchsia-950 dark:border-fuchsia-800/70 dark:from-fuchsia-950/70 dark:via-fuchsia-900/45 dark:to-fuchsia-950/20 dark:text-fuchsia-50",
  };

  const iconByAction: Record<string, string> = {
    browse: "bg-sky-500/18 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    purchases: "bg-violet-500/18 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
    saved: "bg-rose-500/18 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
    requests: "bg-amber-500/18 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    notifications: "bg-orange-500/18 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200",
    tools: "bg-teal-500/18 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200",
    history: "bg-indigo-500/18 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200",
    courses: "bg-emerald-500/18 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    account: "bg-slate-500/18 text-slate-700 dark:bg-slate-400/15 dark:text-slate-200",
    upload: "bg-emerald-500/18 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    sales: "bg-sky-500/18 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    "payment-settings": "bg-amber-500/18 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
  };

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {actions.map((action) => {
        const Icon = ICONS[action.icon];
        const cardTone = toneByAction[action.id] ?? "border-border bg-card text-foreground";
        const iconTone = iconByAction[action.id] ?? "bg-muted text-primary";
        return (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => trackAction(action.id, action.href, action.label)}
            className={`group relative min-h-[92px] overflow-hidden rounded-2xl border p-3 shadow-[0_12px_24px_-14px_rgba(15,23,42,0.42)] ring-1 ring-black/[0.03] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-14px_rgba(15,23,42,0.48)] active:translate-y-0 sm:min-h-[108px] sm:p-4 ${cardTone}`}
          >
            <span className="absolute -right-5 -top-6 h-16 w-16 rounded-full bg-white/35 blur-2xl dark:bg-white/5" />
            <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${iconTone} ring-1 ring-black/5 dark:ring-white/10`}>
              <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </span>
            <span className="relative mt-3 block pr-2 text-[11px] font-semibold leading-4 sm:text-sm sm:leading-5">{action.label}</span>
            <span className="absolute bottom-3 right-3 text-current/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true">↗</span>
          </Link>
        );
      })}
    </div>
  );
}
