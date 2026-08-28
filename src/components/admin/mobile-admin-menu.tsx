"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, LayoutDashboard, UploadCloud, UserCheck, CreditCard, Wallet, Flag,
  LifeBuoy, HelpCircle, Users, BookOpen, HardDrive, Percent, Settings,
  FileQuestion, MessageCircle, BadgeCheck, CalendarDays, Clock3, ClipboardCheck,
  Calculator, ListChecks, type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const links: [string, string, LucideIcon][] = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/uploads", "Pending Uploads", UploadCloud],
  ["/admin/sellers", "Seller Requests", UserCheck],
  ["/admin/payments", "Payments", CreditCard],
  ["/admin/payouts", "Payouts", Wallet],
  ["/admin/reports", "Reports", Flag],
  ["/admin/support", "Feedback & Support", LifeBuoy],
  ["/admin/faqs", "FAQs", HelpCircle],
  ["/admin/users", "Users", Users],
  ["/admin/resources", "Resources", BookOpen],
  ["/admin/storage", "Storage", HardDrive],
  ["/admin/commission", "Commission", Percent],
  ["/admin/settings", "Settings", Settings],
];

const studentToolLinks: [string, string, LucideIcon][] = [
  ["/admin/academic-tools/requests", "Resource Requests", FileQuestion],
  ["/admin/student-tools/support", "Support", MessageCircle],
  ["/admin/student-tools/reports", "Reports", Flag],
  ["/admin/student-tools/seller-verification", "Seller Verification", BadgeCheck],
  ["/admin/student-tools/academic-calendar", "Academic Calendar", CalendarDays],
  ["/admin/student-tools/deadlines", "Deadlines", Clock3],
  ["/admin/student-tools/final-exams", "Final Exams", ClipboardCheck],
  ["/admin/student-tools/grade-calculator", "Grade Calculator", Calculator],
  ["/admin/student-tools/prerequisite-checker", "Prerequisite Checker", ListChecks],
];

function GridLink({ href, label, Icon, active, onClick }: { href: string; label: string; Icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-[11px] font-medium leading-tight ${active ? "border-primary/30 bg-primary/10 text-primary" : "border-transparent bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"}`}
    >
      <Icon className="h-5 w-5" />
      <span className="line-clamp-2">{label}</span>
    </Link>
  );
}

export function MobileAdminMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close admin menu" : "Open admin menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <>
          <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-12 z-50 max-h-[80vh] overflow-y-auto rounded-2xl border bg-background p-3 shadow-2xl">
            <div className="grid grid-cols-2 gap-2">
              {links.map(([href, label, Icon]) => (
                <GridLink key={href} href={href} label={label} Icon={Icon} active={pathname === href} onClick={() => setOpen(false)} />
              ))}
            </div>
            <div className="my-3 border-t pt-3">
              <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Student Tools</p>
              <div className="grid grid-cols-2 gap-2">
                {studentToolLinks.map(([href, label, Icon]) => (
                  <GridLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(href)} onClick={() => setOpen(false)} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
