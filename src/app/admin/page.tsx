import Link from "next/link";
import { AlertCircle, ArrowRight, CreditCard, FileCheck2, Flag, Store, Wallet, Users, Files } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const supabase = createClient();
  const [{ count: pendingCount }, { count: userCount }, { count: publishedCount }, { count: reportCount }, { count: sellerReqCount }, { count: paymentReqCount }, { count: payoutReqCount }] =
    await Promise.all([
      supabase.from("files").select("id", { count: "exact", head: true }).eq("visibility", "draft"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("files").select("id", { count: "exact", head: true }).eq("visibility", "published"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "pending"),
      supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "pending").eq("payment_method", "bkash"),
      supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const { data: revenueRows } = await supabase.from("purchases").select("commission_cents").eq("status", "completed");
  const totalCommission = (revenueRows ?? []).reduce((sum, r) => sum + r.commission_cents, 0);
  const actions = [
    { href: "/admin/payments", label: "Payments", count: paymentReqCount ?? 0, icon: CreditCard, tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    { href: "/admin/sellers", label: "Seller requests", count: sellerReqCount ?? 0, icon: Store, tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
    { href: "/admin/uploads", label: "Upload reviews", count: pendingCount ?? 0, icon: FileCheck2, tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { href: "/admin/payouts", label: "Payout requests", count: payoutReqCount ?? 0, icon: Wallet, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { href: "/admin/reports", label: "Open reports", count: reportCount ?? 0, icon: Flag, tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-primary">Admin workspace</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Action center</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Your pending business tasks are grouped here so you can review and approve them quickly.</p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Needs your attention</h3>
            <p className="text-sm text-muted-foreground">Start with the cards that have pending work.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {actions.map(({ href, label, count, icon: Icon, tone }) => (
            <Link key={href} href={href} className="group rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-4 text-sm font-semibold">{label}</p>
              <div className="mt-1 flex items-end justify-between gap-2"><span className="text-3xl font-bold">{count}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Published resources" value={String(publishedCount ?? 0)} icon={<Files className="h-4 w-4" />} />
        <StatCard label="Total users" value={String(userCount ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Platform commission" value={formatBDT(totalCommission)} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Total pending actions" value={String((pendingCount ?? 0) + (reportCount ?? 0) + (sellerReqCount ?? 0) + (paymentReqCount ?? 0) + (payoutReqCount ?? 0))} icon={<AlertCircle className="h-4 w-4" />} highlight />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/admin/users">Manage users</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/commission">Commission</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/settings">Settings</Link></Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/[0.03]" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-muted-foreground">{label}</CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent><div className="text-xl font-bold sm:text-2xl">{value}</div></CardContent>
    </Card>
  );
}
