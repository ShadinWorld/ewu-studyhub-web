export type AdminQuickAction = {
  key: string;
  title: string;
  href: string;
  icon: string;
  tone: string;
  order: number;
};

/**
 * Complete admin-module inventory used by the Admin Dashboard Quick Actions.
 * Keep this list aligned with the real /admin routes and operational controls.
 * Dynamic per-user pages intentionally remain behind their parent module (Users).
 */
export const ADMIN_QUICK_ACTIONS: AdminQuickAction[] = [
  { key: "overview", title: "Admin Overview", href: "/admin", icon: "LayoutDashboard", tone: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300", order: 1 },
  { key: "pending-work", title: "Pending Work", href: "/admin/pending", icon: "Inbox", tone: "border-primary/30 bg-primary/10 text-primary", order: 2 },
  { key: "admin-search", title: "Admin Search", href: "/admin/search", icon: "Search", tone: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300", order: 3 },
  { key: "users", title: "Users & Roles", href: "/admin/users", icon: "Users", tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", order: 4 },
  { key: "seller-requests", title: "Seller Verification", href: "/admin/sellers", icon: "UserCheck", tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300", order: 5 },
  { key: "pending-sellers", title: "Pending Seller Verification", href: "/admin/pending?type=sellers", icon: "BadgeCheck", tone: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300", order: 6 },
  { key: "pending-uploads", title: "Pending Uploads", href: "/admin/uploads", icon: "UploadCloud", tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", order: 7 },
  { key: "pending-resource-reviews", title: "Pending Resource Reviews", href: "/admin/pending?type=resources", icon: "FileCheck2", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300", order: 8 },
  { key: "resources", title: "Resources", href: "/admin/resources", icon: "BookOpen", tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", order: 9 },
  { key: "admin-resource-upload", title: "Upload Resource", href: "/admin/resources/upload", icon: "FilePlus2", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300", order: 10 },
  { key: "payments", title: "bKash Payments", href: "/admin/payments", icon: "CreditCard", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", order: 11 },
  { key: "pending-purchases", title: "Pending Purchase Reviews", href: "/admin/pending?type=purchases", icon: "ReceiptText", tone: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300", order: 12 },
  { key: "payouts", title: "Seller Payouts", href: "/admin/payouts", icon: "WalletCards", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", order: 13 },
  { key: "pending-payouts", title: "Pending Payouts", href: "/admin/pending?type=payouts", icon: "Wallet", tone: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300", order: 14 },
  { key: "reports", title: "Reports", href: "/admin/reports", icon: "Flag", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300", order: 15 },
  { key: "open-reports", title: "Open Reports", href: "/admin/pending?type=reports", icon: "ShieldAlert", tone: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", order: 16 },
  { key: "support", title: "Feedback & Support", href: "/admin/support", icon: "LifeBuoy", tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", order: 17 },
  { key: "support-queue", title: "Pending Support Queue", href: "/admin/pending?type=support", icon: "MessageSquareText", tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", order: 18 },
  { key: "faqs", title: "FAQs", href: "/admin/faqs", icon: "HelpCircle", tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", order: 19 },
  { key: "help-guide", title: "Help & User Guide", href: "/admin/help", icon: "BookOpenCheck", tone: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300", order: 20 },
  { key: "storage", title: "Storage Health", href: "/admin/storage", icon: "HardDrive", tone: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300", order: 21 },
  { key: "commission", title: "Platform Fees", href: "/admin/commission", icon: "Percent", tone: "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300", order: 22 },
  { key: "settings", title: "Admin Settings", href: "/admin/settings", icon: "Settings", tone: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300", order: 23 },
  { key: "history", title: "Activity History", href: "/admin/history", icon: "History", tone: "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300", order: 24 },
  { key: "academic-tools", title: "Academic Tools & Updates", href: "/admin/academic-tools", icon: "GraduationCap", tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", order: 25 },
  { key: "resource-requests", title: "Resource Requests", href: "/admin/academic-tools/requests", icon: "FileQuestion", tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300", order: 26 },
  { key: "pending-resource-requests", title: "Open Resource Requests", href: "/admin/pending?type=resource_requests", icon: "MessageSquarePlus", tone: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300", order: 27 },
  { key: "academic-calendar", title: "Academic Calendar & Exams", href: "/admin/academic-tools/calendar", icon: "CalendarDays", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", order: 28 },
  { key: "deadlines", title: "Deadline Tracker", href: "/admin/academic-tools/deadlines", icon: "Clock3", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", order: 29 },
  { key: "hero-banners", title: "Giant Hero Banner Manager", href: "/admin/academic-tools/banners", icon: "ImagePlus", tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300", order: 30 },
  { key: "student-tool-resource-requests", title: "Resource Requests Tool", href: "/admin/student-tools/resource-requests", icon: "FileQuestion", tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300", order: 31 },
  { key: "student-tool-support", title: "Student Support Tool", href: "/admin/student-tools/support", icon: "LifeBuoy", tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", order: 32 },
  { key: "student-tool-reports", title: "Student Report Tool", href: "/admin/student-tools/reports", icon: "Flag", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300", order: 33 },
  { key: "student-tool-seller-verification", title: "Student Seller Verification Tool", href: "/admin/student-tools/seller-verification", icon: "BadgeCheck", tone: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300", order: 34 },
  { key: "student-tool-calendar", title: "Student Academic Calendar", href: "/admin/student-tools/academic-calendar", icon: "Calendar", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", order: 35 },
  { key: "student-tool-deadlines", title: "Student Deadlines", href: "/admin/student-tools/deadlines", icon: "CalendarClock", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", order: 36 },
  { key: "student-tool-final-exams", title: "Final Exams Tool", href: "/admin/student-tools/final-exams", icon: "ClipboardCheck", tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300", order: 37 },
  { key: "student-tool-grade-calculator", title: "Grade Calculator", href: "/admin/student-tools/grade-calculator", icon: "Calculator", tone: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300", order: 38 },
  { key: "student-tool-prerequisite-checker", title: "Prerequisite Checker", href: "/admin/student-tools/prerequisite-checker", icon: "ListChecks", tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", order: 39 },
  { key: "student-tools-manager", title: "Student Academic Tool Manager", href: "/admin/academic-tools/student-tools", icon: "SlidersHorizontal", tone: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300", order: 40 },
];
