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
    browse: "border-sky-200/80 bg-sky-50/80 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100",
    purchases: "border-violet-200/80 bg-violet-50/80 text-violet-950 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-100",
    saved: "border-rose-200/80 bg-rose-50/80 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-100",
    requests: "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100",
    notifications: "border-orange-200/80 bg-orange-50/80 text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-100",
    tools: "border-teal-200/80 bg-teal-50/80 text-teal-950 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-100",
    history: "border-indigo-200/80 bg-indigo-50/80 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-100",
    courses: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100",
    account: "border-slate-200/80 bg-slate-50/90 text-slate-950 dark:border-slate-800 dark:bg-slate-900/65 dark:text-slate-100",
    upload: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100",
    sales: "border-sky-200/80 bg-sky-50/80 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-100",
    "payment-settings": "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100",
  };

  const iconByAction: Record<string, string> = {
    browse: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    purchases: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
    saved: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
    requests: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    notifications: "bg-orange-500/12 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200",
    tools: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200",
    history: "bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200",
    courses: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    account: "bg-slate-500/12 text-slate-700 dark:bg-slate-400/15 dark:text-slate-200",
    upload: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    sales: "bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    "payment-settings": "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
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
            className={`group relative min-h-[92px] overflow-hidden rounded-2xl border p-3 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.55)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.65)] active:translate-y-0 sm:min-h-[108px] sm:p-4 ${cardTone}`}
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
