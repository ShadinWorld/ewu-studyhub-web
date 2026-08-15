import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { AdminAccountSwitcher } from "@/components/admin/admin-account-switcher";
import { createAdminClient } from "@/lib/supabase/server";
import { Menu, ShieldCheck } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) redirect("/");

  const admin = createAdminClient();
  const { data: adminProfiles } = await admin.from("profiles").select("id, full_name, role").in("role", ["admin", "super_admin"]).order("full_name");
  const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const admins = (adminProfiles ?? []).map((p) => ({ id: p.id, name: p.full_name || "Admin", email: authUsers.users.find((u) => u.id === p.id)?.email || "" })).filter((a) => a.email);

  const links = [
    ["/admin", "Overview"],
    ["/admin/uploads", "Pending Uploads"],
    ["/admin/sellers", "Seller Requests"],
    ["/admin/payments", "Payments"],
    ["/admin/payouts", "Payouts"],
    ["/admin/reports", "Reports"],
    ["/admin/support", "Feedback & Support"],
    ["/admin/users", "Users"],
    ["/admin/commission", "Commission"],
    ["/admin/settings", "Settings"],
  ] as const;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/20 p-4 md:block">
        <Link href="/" className="mb-6 flex items-center gap-2 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></span>EWU StudyHub</Link>
        <p className="mb-4 rounded-xl border bg-card p-3 text-xs text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{profile.full_name || "Admin"}</span></p>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map(([href, label]) => <Link key={href} href={href} className="rounded-xl px-3 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">{label}</Link>)}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-3 backdrop-blur-xl sm:h-16 sm:px-6">
          <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary md:hidden"><Menu className="h-5 w-5" /></span><h1 className="font-semibold">Admin Panel</h1></div>
          <div className="flex items-center gap-2"><AdminAccountSwitcher currentName={profile.full_name || "Admin"} currentEmail={user.email || ""} admins={admins} /><Button variant="outline" size="sm" asChild className="hidden sm:inline-flex"><Link href="/">Visit site</Link></Button><ThemeToggle /></div>
        </header>
        <main className="p-4 pb-24 sm:p-6 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
