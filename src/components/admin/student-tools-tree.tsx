"use client";
import Link from "next/link";
import { ChevronDown, FileQuestion, LifeBuoy, Flag, UserCheck, CalendarDays, ClipboardList, BookOpen, Calculator, ListChecks } from "lucide-react";
import { usePathname } from "next/navigation";
const items = [
  ["/admin/student-tools/resource-requests", "Resource Requests", FileQuestion],
  ["/admin/student-tools/support", "Support", LifeBuoy],
  ["/admin/student-tools/reports", "Reports", Flag],
  ["/admin/student-tools/seller-verification", "Seller Verification", UserCheck],
  ["/admin/student-tools/academic-calendar", "Academic Calendar", CalendarDays],
  ["/admin/student-tools/deadlines", "Deadlines", ClipboardList],
  ["/admin/student-tools/final-exams", "Final Exams", BookOpen],
  ["/admin/student-tools/grade-calculator", "Grade Calculator", Calculator],
  ["/admin/student-tools/prerequisite-checker", "Prerequisite Checker", ListChecks],
] as const;
export function StudentToolsTree() { const pathname = usePathname(); return <details className="group rounded-xl border bg-card"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"><span>Student Tools</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><div className="space-y-1 px-2 pb-2">{items.map(([href,label,Icon]) => <Link key={href} href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent ${pathname.startsWith(href) ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}><Icon className="h-4 w-4" />{label}</Link>)}</div></details>; }
