import Link from "next/link";
import {
  Activity, ArrowRight, BellRing, ClipboardList, CreditCard, Flag, LifeBuoy,
  LayoutDashboard, Settings, Upload, Users, WalletCards, UserCheck, Clock3,
  type LucideIcon,
} from "lucide-react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinimizableSection } from "@/components/homepage/minimizable-section";

const iconMap: Record<string, LucideIcon> = { Upload, Users, WalletCards, CreditCard, Flag, ClipboardList, LifeBuoy, Settings, LayoutDashboard, UserCheck };

type AttentionItem = {
  id?: string | null;
  title: string;
  href: string;
  count: number;
  tone: string;
  icon?: string | null;
  display_order?: number | null;
  is_enabled?: boolean | null;
};

export async function AdminHomeActions() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;

  const admin = createAdminClient();
  const [{ data: actions }, { data: attentionSettings }, pending] = await Promise.all([
    admin.from("homepage_quick_actions").select("id,title,icon,href,display_order,is_enabled").eq("audience", "admin").eq("is_enabled", true).order("display_order", { ascending: true }).limit(9),
    admin.from("homepage_quick_attention").select("id,title,icon,href,display_order,is_enabled").eq("audience", "admin").eq("is_enabled", true).order("display_order", { ascending: true }).limit(8),
    getPendingSummary(admin),
  ]);

  const attentionLookup: Record<string, { count: number; tone: string; href: string }> = {
    "/admin/pending?type=resources": { count: pending.uploads, tone: "bg-amber-500", href: "/admin/pending?type=resources" },
    "/admin/pending?type=sellers": { count: pending.sellers, tone: "bg-orange-500", href: "/admin/pending?type=sellers" },
    "/admin/pending?type=payouts": { count: pending.payouts, tone: "bg-rose-500", href: "/admin/pending?type=payouts" },
    "/admin/pending?type=purchases": { count: pending.purchases, tone: "bg-sky-500", href: "/admin/pending?type=purchases" },
    "/admin/pending?type=resource_requests": { count: pending.resourceRequests, tone: "bg-violet-500", href: "/admin/pending?type=resource_requests" },
    "/admin/pending?type=reports": { count: pending.reports, tone: "bg-red-500", href: "/admin/pending?type=reports" },
    "/admin/pending?type=support": { count: pending.support, tone: "bg-cyan-500", href: "/admin/pending?type=support" },
    "/admin/pending": { count: pending.total, tone: pending.total ? "bg-primary" : "bg-emerald-500", href: "/admin/pending" },
  };
  const needs: AttentionItem[] = (attentionSettings ?? []).map((item) => ({
    ...item,
    ...(attentionLookup[item.href] ?? { count: 0, tone: "bg-muted-foreground", href: item.href }),
  }));
  const quickAttention = needs.filter((item) => item.count > 0).slice(0, 8);
  const visibleNeeds = quickAttention.length ? quickAttention : needs.slice(0, 4);
  const overdue = pending.overdueQueues;

  return (
    <div className="container space-y-5 pt-6 sm:pt-8">
      <MinimizableSection id="admin-quick-attention" title="Quick Attention" description="Live shortcuts to the queues that need attention." className="rounded-3xl bg-card">
      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">Admin workspace</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Quick Attention</h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">The most important items waiting for you right now.</p></div>
          <Button asChild size="sm" variant="outline"><Link href="/admin/pending">View all pending</Link></Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleNeeds.map((item) => <Link key={item.id ?? item.href} href={item.href} className="rounded-2xl border bg-background p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:p-4"><div className="flex items-center justify-between gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`} /><span className="text-xl font-bold">{item.count}</span></div><p className="mt-2 text-xs font-semibold leading-4 sm:text-sm">{item.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.count ? "Needs review" : "Clear"}</p></Link>)}
          <Link href="/admin/pending" className="rounded-2xl border border-dashed bg-primary/5 p-3 transition hover:border-primary/50 sm:p-4"><ArrowRight className="h-5 w-5 text-primary"/><p className="mt-2 text-xs font-semibold leading-4 sm:text-sm">Pending Work</p><p className="mt-1 text-[11px] text-muted-foreground">Open the full queue</p></Link>
        </div>
        {overdue > 0 ? <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{overdue} queue{overdue === 1 ? " is" : "s are"} beyond the configured response-time target.</p> : <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />All active queues are within the configured response-time target.</p>}
      </section>
      </MinimizableSection>

      <MinimizableSection id="admin-needs-attention" title="Needs Attention" description="All pending admin queues in one place." className="rounded-3xl bg-card">
      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">Admin workspace</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Needs Attention</h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Every pending queue in one place, with direct links and live counts.</p></div>
          <Button asChild size="sm" variant="outline"><Link href="/admin/pending">View all</Link></Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {needs.map((item) => <Link key={item.id ?? item.href} href={item.href} className="flex items-center justify-between rounded-xl border p-3 hover:border-primary/40"><div className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.tone}`} /><span className="truncate text-sm font-medium">{item.title}</span></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{item.count}</span></Link>)}
        </div>
      </section>
      </MinimizableSection>

      <MinimizableSection id="admin-quick-actions" title="Quick Actions" description="Your configurable shortcuts." className="rounded-3xl bg-card">
      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">Admin workspace</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Quick Actions</h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Your most-used admin shortcuts. The last tile lets you add or edit them.</p></div>
          <Button asChild size="sm" variant="outline"><Link href="/admin/settings">Customize</Link></Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {(actions ?? []).map((action) => { const Icon = iconMap[action.icon] ?? LayoutDashboard; return <Link key={action.id} href={action.href} className="group rounded-2xl border bg-background p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:p-4"><Icon className="h-5 w-5 text-primary"/><p className="mt-3 line-clamp-2 text-sm font-semibold leading-5">{action.title}</p><p className="mt-1 text-[11px] text-muted-foreground">Open</p></Link>; })}
          <Link href="/admin/settings" className="group rounded-2xl border border-dashed bg-primary/5 p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:p-4"><Settings className="h-5 w-5 text-primary"/><p className="mt-3 text-sm font-semibold leading-5">＋ Add / customize</p><p className="mt-1 text-[11px] text-muted-foreground">Choose your shortcuts</p></Link>
        </div>
      </section>
      </MinimizableSection>
    </div>
  );
}

type PendingSummary = {
  uploads: number; sellers: number; payouts: number; purchases: number; resourceRequests: number; reports: number; support: number; total: number; overdueQueues: number;
};

async function getPendingSummary(admin: ReturnType<typeof createAdminClient>): Promise<PendingSummary> {
  const [uploads, sellers, payouts, purchases, resourceRequests, reports, support, settings] = await Promise.all([
    admin.from("files").select("id,created_at", { count: "exact" }).eq("visibility", "draft").order("created_at", { ascending: true }).limit(1),
    admin.from("profiles").select("id,created_at", { count: "exact" }).eq("student_id_verification_status", "pending").order("created_at", { ascending: true }).limit(1),
    admin.from("payouts").select("id,created_at", { count: "exact" }).eq("status", "pending").order("created_at", { ascending: true }).limit(1),
    admin.from("purchases").select("id,created_at", { count: "exact" }).eq("status", "pending").order("created_at", { ascending: true }).limit(1),
    admin.from("resource_requests").select("id,created_at", { count: "exact" }).eq("status", "open").order("created_at", { ascending: true }).limit(1),
    admin.from("reports").select("id,created_at", { count: "exact" }).eq("status", "open").order("created_at", { ascending: true }).limit(1),
    admin.from("support_tickets").select("id,created_at", { count: "exact" }).in("status", ["new", "in_review"]).order("created_at", { ascending: true }).limit(1),
    admin.from("platform_response_time_settings").select("category,estimated_hours"),
  ]);
  const counts = { uploads: uploads.count ?? 0, sellers: sellers.count ?? 0, payouts: payouts.count ?? 0, purchases: purchases.count ?? 0, resourceRequests: resourceRequests.count ?? 0, reports: reports.count ?? 0, support: support.count ?? 0 };
  const hours = new Map<string, number>((settings.data ?? []).map(row => [row.category, Number(row.estimated_hours)]));
  const defaultHours = Number(hours.get("default") ?? 6) || 6;
  const now = Date.now();
  const queues: Array<[string, number, string | undefined]> = [
    ["resource_approval", counts.uploads, uploads.data?.[0]?.created_at],
    ["seller_verification", counts.sellers, sellers.data?.[0]?.created_at],
    ["payout_request", counts.payouts, payouts.data?.[0]?.created_at],
    ["purchase_request", counts.purchases, purchases.data?.[0]?.created_at],
    ["resource_request", counts.resourceRequests, resourceRequests.data?.[0]?.created_at],
    ["report", counts.reports, reports.data?.[0]?.created_at],
    ["support", counts.support, support.data?.[0]?.created_at],
  ];
  const overdueQueues = queues.filter(([category, count, oldest]) => {
    if (!count || !oldest) return false;
    const threshold = (Number(hours.get(category) ?? defaultHours) || defaultHours) * 60 * 60 * 1000;
    return now - new Date(oldest).getTime() > threshold;
  }).length;
  return { ...counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0), overdueQueues };
}

export async function UserRecentActivity() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: notifications } = await supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5);
  if (!notifications?.length) return null;
  return <section className="container py-6 sm:py-8"><div className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Recent activity</p><h2 className="mt-1 text-xl font-bold">What changed recently</h2></div><Button asChild size="sm" variant="outline"><Link href="/notifications">View all</Link></Button></div><div className="mt-4 space-y-2">{notifications.map((n)=><Link key={n.id} href={n.link??"/notifications"} className="block rounded-xl border p-3 hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{n.body}</p></div><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/></div><p className="mt-2 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></Link>)}</div></div></section>;
}
