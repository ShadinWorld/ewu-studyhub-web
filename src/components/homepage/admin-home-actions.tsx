import Link from "next/link";
import {
  Activity, ArrowRight, BellRing, ClipboardList, CreditCard, Flag, LifeBuoy,
  LayoutDashboard, Settings, Upload, Users, WalletCards, UserCheck, Clock3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, any> = { Upload, Users, WalletCards, CreditCard, Flag, ClipboardList, LifeBuoy, Settings, LayoutDashboard, UserCheck };

export async function AdminHomeActions() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;

  const admin = supabase as any;
  const [{ data: actions }, pending] = await Promise.all([
    admin.from("homepage_quick_actions").select("id,title,icon,href,display_order,is_enabled").eq("audience", "admin").eq("is_enabled", true).order("display_order", { ascending: true }).limit(9),
    getPendingSummary(admin),
  ]);

  const needs = [
    { label: "Resource approvals", count: pending.uploads, href: "/admin/pending?type=resources", tone: "bg-amber-500" },
    { label: "Seller verification", count: pending.sellers, href: "/admin/pending?type=sellers", tone: "bg-orange-500" },
    { label: "Payout requests", count: pending.payouts, href: "/admin/pending?type=payouts", tone: "bg-rose-500" },
    { label: "Purchase requests", count: pending.purchases, href: "/admin/pending?type=purchases", tone: "bg-sky-500" },
  ];

  return (
    <div className="container space-y-5 pt-6 sm:pt-8">
      <section className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">Admin workspace</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Quick Actions</h2><p className="mt-1 text-xs text-muted-foreground sm:text-sm">Your most-used admin shortcuts, customized from Admin → Settings.</p></div>
          <Button asChild size="sm" variant="outline"><Link href="/admin/settings">Customize</Link></Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {(actions ?? []).map((action: any) => { const Icon = iconMap[action.icon] ?? LayoutDashboard; return <Link key={action.id} href={action.href} className="group rounded-2xl border bg-background p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:p-4"><Icon className="h-5 w-5 text-primary"/><p className="mt-3 text-sm font-semibold leading-5">{action.title}</p><p className="mt-1 text-[11px] text-muted-foreground">Open</p></Link>; })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/>Quick Attention</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">{needs.slice(0,4).map((item) => <Link key={item.label} href={item.href} className="rounded-xl border bg-background p-3 hover:border-primary/40"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`}/><span className="text-xl font-bold">{item.count}</span></div><p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p></Link>)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary"/>Needs Attention</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">{needs.map((item) => <Link key={item.label} href={item.href} className="flex items-center justify-between rounded-xl border p-3 hover:border-primary/40"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.tone}`}/><span className="text-sm font-medium">{item.label}</span></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{item.count}</span></Link>)}</div><Button asChild className="mt-4 w-full"><Link href="/admin/pending">View all pending work <ArrowRight className="h-4 w-4"/></Link></Button></CardContent>
        </Card>
      </section>
    </div>
  );
}

async function getPendingSummary(admin: any) {
  const [{ count: uploads }, { count: sellers }, { count: payouts }, { count: purchases }] = await Promise.all([
    admin.from("files").select("id", { count: "exact", head: true }).eq("visibility", "draft"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "pending"),
    admin.from("payouts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("purchases").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return { uploads: uploads ?? 0, sellers: sellers ?? 0, payouts: payouts ?? 0, purchases: purchases ?? 0 };
}

export async function UserRecentActivity() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: notifications } = await supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(5);
  if (!notifications?.length) return null;
  return <section className="container py-6 sm:py-8"><div className="rounded-3xl border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Recent activity</p><h2 className="mt-1 text-xl font-bold">What changed recently</h2></div><Button asChild size="sm" variant="outline"><Link href="/notifications">View all</Link></Button></div><div className="mt-4 space-y-2">{notifications.map((n)=><Link key={n.id} href={n.link??"/notifications"} className="block rounded-xl border p-3 hover:border-primary/40"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{n.body}</p></div><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"/></div><p className="mt-2 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p></Link>)}</div></div></section>;
}
