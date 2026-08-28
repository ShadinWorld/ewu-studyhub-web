import Link from "next/link";
import {
  Activity,
  AlertCircle,
  BookOpen,
  CreditCard,
  FileCheck2,
  Files,
  FileQuestion,
  Flag,
  ImagePlus,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  HardDrive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shortDay(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

export default async function AdminOverviewPage() {
  const supabase = createClient();
  const [
    { count: pendingUploads },
    { count: userCount },
    { count: publishedResources },
    { count: reportCount },
    { count: sellerRequests },
    { count: paymentRequests },
    { count: payoutRequests },
    { count: supportCount },
    { count: sellerCount },
    { count: openResourceRequests },
    { count: liveBannerCount },
    { data: purchases },
    { data: recentLogs },
    { data: dailyStats },
    { data: storageUsage },
  ] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }).eq("visibility", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("files").select("id", { count: "exact", head: true }).eq("visibility", "published"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "pending"),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "pending").eq("payment_method", "bkash"),
    supabase.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending").eq("payment_method", "bkash"),
    supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["new", "in_review"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_seller", true),
    supabase.from("resource_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("purchases").select("amount_cents, commission_cents, seller_earning_cents, created_at").eq("status", "completed"),
    supabase.from("audit_logs").select("id, action, target_table, target_id, metadata, actor_id, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("platform_daily_stats").select("date,new_users,active_users,total_sales,total_revenue_cents,total_commission_cents").order("date", { ascending: false }).limit(14),
    supabase.rpc("admin_storage_usage"),
  ]);

  const actorIds = Array.from(new Set((recentLogs ?? []).map((log) => log.actor_id).filter((id): id is string => Boolean(id))));
  const { data: actorProfiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const actorNames = new Map((actorProfiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const completedPurchases = (purchases ?? []).filter((row) => true);
  const totalRevenue = completedPurchases.reduce((sum, row) => sum + Number(row.amount_cents ?? 0), 0);
  const totalCommission = completedPurchases.reduce((sum, row) => sum + Number(row.commission_cents ?? 0), 0);
  const totalSellerEarnings = completedPurchases.reduce((sum, row) => sum + Number((row as any).seller_earning_cents ?? 0), 0);
  const totalStorage = (storageUsage ?? []).reduce((sum, row) => sum + Number(row.total_bytes ?? 0), 0);
  const formatStorage = (bytes: number) => { if (!bytes) return "0 B"; const u=["B","KB","MB","GB","TB"]; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),u.length-1); return `${(bytes/1024**i).toFixed(i===0?0:1)} ${u[i]}`; };
  const totalPending = (pendingUploads ?? 0) + (sellerRequests ?? 0) + (paymentRequests ?? 0) + (payoutRequests ?? 0) + (reportCount ?? 0) + (supportCount ?? 0);
  const todayKey = new Date().toISOString().slice(0,10);
  const todayCompleted = completedPurchases.filter((p) => dayKey(new Date(p.created_at)) === todayKey);
  const todaySales = todayCompleted.reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayoutTotal = (await supabase.from("payouts").select("amount_cents").eq("status", "pending")).data?.reduce((sum: number, p: any) => sum + Number(p.amount_cents ?? 0), 0) ?? 0;
  const completedPayoutTotal = (await supabase.from("payouts").select("amount_cents").eq("status", "completed")).data?.reduce((sum: number, p: any) => sum + Number(p.amount_cents ?? 0), 0) ?? 0;

  const computedDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = dayKey(date);
    const rows = (purchases ?? []).filter((p) => dayKey(new Date(p.created_at)) === key);
    return {
      date: key,
      sales: rows.length,
      revenue: rows.reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0),
    };
  });
  const chart = (dailyStats ?? []).length
    ? [...dailyStats!].reverse().slice(-7).map((row) => ({ date: row.date, sales: row.total_sales, revenue: row.total_revenue_cents }))
    : computedDays;
  const maxRevenue = Math.max(1, ...chart.map((row) => row.revenue));

  const actions = [
    { href: "/admin/payments", label: "bKash payments", count: paymentRequests ?? 0, icon: CreditCard, tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    { href: "/admin/sellers", label: "Seller verification", count: sellerRequests ?? 0, icon: Store, tone: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
    { href: "/admin/uploads", label: "Upload reviews", count: pendingUploads ?? 0, icon: FileCheck2, tone: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { href: "/admin/payouts", label: "Seller payouts", count: payoutRequests ?? 0, icon: Wallet, tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { href: "/admin/reports", label: "Open reports", count: reportCount ?? 0, icon: Flag, tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
    { href: "/admin/support", label: "Support requests", count: supportCount ?? 0, icon: AlertCircle, tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
    { href: "/admin/academic-tools/requests", label: "Resource requests", count: openResourceRequests ?? 0, icon: FileQuestion, tone: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
    { href: "/admin/academic-tools/banners", label: "Hero banners", count: liveBannerCount ?? 0, icon: ImagePlus, tone: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Needs your attention</h3>
            <p className="text-sm text-muted-foreground">Open the right queue without hunting through menus.</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold">{totalPending} open</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {actions.map(({ href, label, count, icon: Icon, tone }) => (
            <Link key={href} href={href} className="group flex flex-col items-center gap-1.5 rounded-xl border bg-card p-2.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:rounded-2xl sm:p-3.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${tone}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight sm:text-sm">{label}</p>
              <p className="text-base font-bold sm:text-xl">{count}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-background p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Admin control center</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good to see you. Here is what needs attention.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Monitor marketplace health, verify sellers, review payments, manage resources and jump directly to anything waiting for you.</p>
          </div>
          <Button asChild><Link href="/admin/search"><Search className="h-4 w-4" />Search admin</Link></Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard label="Users" value={String(userCount ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Sellers" value={String(sellerCount ?? 0)} icon={<Store className="h-4 w-4" />} />
        <StatCard label="Resources" value={String(publishedResources ?? 0)} icon={<Files className="h-4 w-4" />} />
        <StatCard label="Revenue" value={formatBDT(totalRevenue)} icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Commission" value={formatBDT(totalCommission)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Pending" value={String(totalPending)} icon={<AlertCircle className="h-4 w-4" />} highlight />
      </section>

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MiniMetric label="Today sales" value={formatBDT(todaySales)} /><MiniMetric label="Platform revenue" value={formatBDT(totalCommission)} /><MiniMetric label="Seller earnings" value={formatBDT(totalSellerEarnings)} /><MiniMetric label="Pending payout" value={formatBDT(pendingPayoutTotal)} /><MiniMetric label="Completed payout" value={formatBDT(completedPayoutTotal)} /></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Marketplace analytics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniMetric label="7-day sales" value={String(chart.reduce((s, r) => s + r.sales, 0))} />
              <MiniMetric label="7-day revenue" value={formatBDT(chart.reduce((s, r) => s + r.revenue, 0))} />
              <MiniMetric label="Published" value={String(publishedResources ?? 0)} />
              <MiniMetric label="Open reports" value={String(reportCount ?? 0)} />
            </div>
            <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
              {chart.map((row) => <div key={row.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-12 rounded-t-lg bg-primary/70" style={{ height: `${Math.max(8, Math.round((row.revenue / maxRevenue) * 100))}%` }} title={`${formatBDT(row.revenue)} revenue`} /><span className="text-[10px] text-muted-foreground">{shortDay(row.date)}</span></div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentLogs?.length ? recentLogs.map((log) => <div key={log.id} className="rounded-xl border p-3"><p className="text-sm font-semibold">{String(log.action).replaceAll(".", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{actorNames.get(log.actor_id ?? "") ?? "System"} · {new Date(log.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No admin activity has been logged yet.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink href="/admin/users" icon={<Users className="h-4 w-4" />} title="Users & roles" text="Manage accounts and permissions" />
        <QuickLink href="/admin/resources" icon={<BookOpen className="h-4 w-4" />} title="Resource control" text="Review and manage the catalog" />
        <QuickLink href="/admin/settings" icon={<ShieldCheck className="h-4 w-4" />} title="Security & payments" text="bKash, commission and admin controls" />
        <QuickLink href="/admin/search" icon={<Search className="h-4 w-4" />} title="Global search" text="Find users, courses and resources" />
        <QuickLink href="/admin/storage" icon={<HardDrive className="h-4 w-4" />} title="Storage" text="Monitor usage and clean orphaned files" />
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return <Card className={highlight ? "border-primary/40 bg-primary/[0.03]" : ""}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground">{label}</CardTitle><span className="text-primary">{icon}</span></CardHeader><CardContent><div className="truncate text-lg font-bold sm:text-2xl">{value}</div></CardContent></Card>;
}
function MiniMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border bg-muted/20 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>; }
function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) { return <Link href={href} className="rounded-2xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"><span className="text-primary">{icon}</span><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></Link>; }
