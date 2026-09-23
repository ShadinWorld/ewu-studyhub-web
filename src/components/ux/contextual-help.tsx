"use client";

import { usePathname } from "next/navigation";
import { InfoButton } from "@/components/ux/info-button";

const HELP_BY_PATH: Array<[string, string]> = [
  ["/dashboard/upload", "seller-upload"],
  ["/dashboard/payment-settings", "account_profile"],
  ["/dashboard/sales", "seller-sales"],
  ["/dashboard/become-seller", "general-account"],
  ["/dashboard", "dashboard_overview"],
  ["/search", "general-search"],
  ["/courses", "general-courses"],
  ["/departments", "general-courses"],
  ["/trending", "general-search"],
  ["/purchases", "general-purchase"],
  ["/saved", "general-saved-requests"],
  ["/requests", "general-saved-requests"],
  ["/history", "dashboard_overview"],
  ["/tools", "general-courses"],
  ["/notifications", "notifications"],
  ["/account", "general-account"],
  ["/files/", "resource_access"],
  ["/checkout/", "general-purchase"],
  ["/admin/storage", "admin-storage"],
  ["/admin/payouts", "admin-finance"],
  ["/admin/payments", "admin-finance"],
  ["/admin/pending", "admin_moderation"],
  ["/admin/uploads", "admin_moderation"],
  ["/admin/resources", "admin_moderation"],
  ["/admin/sellers", "admin-operations"],
  ["/admin/users", "admin-operations"],
  ["/admin/help", "admin-operations"],
  ["/admin", "admin-operations"],
  ["/login", "general-getting-started"],
  ["/signup", "general-getting-started"],
  ["/support", "general-account"],
  ["/", "dashboard_overview"],
];

export function ContextualHelp() {
  const pathname = usePathname() || "/";
  const slug = HELP_BY_PATH.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix))?.[1] ?? "general-getting-started";

  return (
    <div className="fixed bottom-24 right-16 z-[58] sm:bottom-6 sm:right-24">
      <InfoButton slug={slug} label="এই page সম্পর্কে Help" />
    </div>
  );
}
