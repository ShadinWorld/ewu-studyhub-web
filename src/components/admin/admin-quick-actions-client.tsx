"use client";

import Link from "next/link";
import {
  BadgeCheck, BookOpen, BookOpenCheck, Calendar, CalendarClock, CalendarDays, ClipboardCheck,
  Clock3, CreditCard, FileCheck2, FilePlus2, FileQuestion, Flag, GraduationCap, HardDrive, HelpCircle,
  History, ImagePlus, Inbox, LayoutDashboard, LifeBuoy, ListChecks, MessageSquarePlus, MessageSquareText,
  Percent, ReceiptText, Search, Settings, ShieldAlert, UploadCloud, UserCheck, Users, Wallet, WalletCards,
  Calculator, type LucideIcon,
} from "lucide-react";
import type { AdminQuickAction } from "@/lib/admin-quick-actions";

const iconMap: Record<string, LucideIcon> = {
  BadgeCheck, BookOpen, BookOpenCheck, Calendar, CalendarClock, CalendarDays, ClipboardCheck,
  Clock3, CreditCard, FileCheck2, FilePlus2, FileQuestion, Flag, GraduationCap, HardDrive, HelpCircle,
  History, ImagePlus, Inbox, LayoutDashboard, LifeBuoy, ListChecks, MessageSquarePlus, MessageSquareText,
  Percent, ReceiptText, Search, Settings, ShieldAlert, UploadCloud, UserCheck, Users, Wallet, WalletCards,
  Calculator,
};

export type AdminQuickActionView = AdminQuickAction & {
  useCount: number;
  lastUsedAt: string | null;
};

function trackAction(key: string) {
  if (typeof window === "undefined") return;
  void fetch(`/api/admin/quick-actions/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

export function AdminQuickActionGrid({ actions }: { actions: AdminQuickActionView[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = iconMap[action.icon] ?? LayoutDashboard;
        return (
          <Link
            key={action.key}
            href={action.href}
            onClick={() => trackAction(action.key)}
            className="group flex min-h-[112px] flex-col items-center gap-1.5 rounded-2xl border bg-card p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:min-h-[122px] sm:p-3.5"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${action.tone}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight sm:text-sm">{action.title}</p>
            <p className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">Open</p>
          </Link>
        );
      })}
    </div>
  );
}
