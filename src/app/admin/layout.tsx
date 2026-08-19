import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileAdminMenu } from "@/components/admin/mobile-admin-menu";
import { AdminActionToast } from "@/components/admin/admin-action-toast";
import { BackButton } from "@/components/navigation/back-button";

const links = [
  ["/admin", "Overview"], ["/admin/uploads", "Pending Uploads"], ["/admin/sellers", "Seller Requests"],
  ["/admin/payments", "Payments"], ["/admin/payouts", "Payouts"], ["/admin/reports", "Reports"],
  ["/admin/support", "Feedback & Support"], ["/admin/faqs", "FAQs"], ["/admin/users", "Users"],
  ["/admin/resources", "Resources"], ["/admin/academic-tools", "Academic Tools"], ["/admin/storage", "Storage"], ["/admin/commission", "Commission"], ["/admin/settings", "Settings"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) redirect("/");

  const [{ count: pendingUploads }, { count: sellerRequests }, { count: payments }, { count: reports }, { count: support }] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }).eq("visibility", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "pending"),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "pending").eq("payment_method", "bkash"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_review"]),
  ]);
  const attention = (pendingUploads ?? 0) + (sellerRequests ?? 0) + (payments ?? 0) + (reports ?? 0) + (support ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 border-r bg-muted/20 p-4 lg:block">
        <Link href="/" className="mb-6 flex items-center gap-2 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>EWU StudyHub</Link>
        <p className="mb-4 rounded-xl border bg-card p-3 text-xs text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{profile.full_name || "Admin"}</span></p>
        <nav className="flex max-h-[calc(100vh-145px)] flex-col gap-1 overflow-y-auto text-sm">
          {links.map(([href, label]) => <Link key={href} href={href} className="rounded-xl px-3 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">{label}</Link>)}
        </nav>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-3 backdrop-blur-xl sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <BackButton className="shrink-0" />
            <MobileAdminMenu />
            <h1 className="truncate font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" asChild title="Search"><Link href="/admin/search"><Search className="h-4 w-4" /></Link></Button>
            <details className="relative"><summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border"><Bell className="h-4 w-4" />{attention > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}</summary><div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border bg-background p-3 shadow-2xl"><p className="font-semibold">Needs attention</p><p className="mt-1 text-xs text-muted-foreground">{attention} item(s) waiting in admin queues.</p><div className="mt-3 grid gap-1 text-sm"><Link className="rounded-lg px-2 py-2 hover:bg-accent" href="/admin/sellers">Seller verification · {sellerRequests ?? 0}</Link><Link className="rounded-lg px-2 py-2 hover:bg-accent" href="/admin/uploads">Uploads · {pendingUploads ?? 0}</Link><Link className="rounded-lg px-2 py-2 hover:bg-accent" href="/admin/payments">bKash payments · {payments ?? 0}</Link><Link className="rounded-lg px-2 py-2 hover:bg-accent" href="/admin/reports">Reports · {reports ?? 0}</Link><Link className="rounded-lg px-2 py-2 hover:bg-accent" href="/admin/support">Support · {support ?? 0}</Link></div></div></details>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex"><Link href="/">Visit site</Link></Button><ThemeToggle />
          </div>
        </header>
        <main className="p-3 pb-20 sm:p-6 lg:p-7"><AdminActionToast />{children}</main>
      </div>
    </div>
  );
}
