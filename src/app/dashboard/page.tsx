import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, Download, Eye, Heart, ShoppingBag, Wallet, Upload, Bell, BookOpen, Clock3, Grid2X2, Settings2, Search, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyUploadsList } from "@/components/files/my-uploads-list";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdaptiveQuickActions, type AdaptiveAction } from "@/components/dashboard/adaptive-quick-actions";

function actionCounts(rows: Array<{ metadata: unknown; created_at: string }>) {
  const counts = new Map<string, { count: number; lastSeen: number }>();
  for (const row of rows) {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : null;
    const actionId = typeof metadata?.action_id === "string" ? metadata.action_id : null;
    if (!actionId) continue;
    const current = counts.get(actionId) ?? { count: 0, lastSeen: 0 };
    const ts = new Date(row.created_at).getTime();
    counts.set(actionId, { count: current.count + 1, lastSeen: Math.max(current.lastSeen, Number.isFinite(ts) ? ts : 0) });
  }
  return counts;
}

function sortAdaptiveActions(actions: AdaptiveAction[], counts: Map<string, { count: number; lastSeen: number }>) {
  return [...actions].sort((a, b) => {
    const aa = counts.get(a.id) ?? { count: 0, lastSeen: 0 };
    const bb = counts.get(b.id) ?? { count: 0, lastSeen: 0 };
    const now = Date.now();
    const recencyA = aa.lastSeen ? Math.max(0, 1 - Math.min(1, (now - aa.lastSeen) / (1000 * 60 * 60 * 24 * 30))) : 0;
    const recencyB = bb.lastSeen ? Math.max(0, 1 - Math.min(1, (now - bb.lastSeen) / (1000 * 60 * 60 * 24 * 30))) : 0;
    const scoreA = aa.count * 1.2 + recencyA * 2 + (a.tone === "primary" ? 0.5 : 0);
    const scoreB = bb.count * 1.2 + recencyB * 2 + (b.tone === "primary" ? 0.5 : 0);
    return scoreB - scoreA;
  });
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_seller, wallet_balance_cents, followers_count")
    .eq("id", user.id)
    .single();

  const isAdmin = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  if (isAdmin) redirect("/admin");

  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");

  if (!isSeller) {
    const [{ data: purchases }, { count: savedCount }, { count: pendingCount }, { data: actionNotifications }, { data: quickActionActivity }] = await Promise.all([
      supabase
        .from("purchases")
        .select("id, file_id, amount_cents, status, files(title)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("wishlists").select("file_id", { count: "exact", head: true }).eq("profile_id", user.id),
      supabase.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "pending"),
      supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).in("type", ["seller_verification_pending","resource_request_update","purchase_pending","purchase_completed","report_update"]).order("created_at", { ascending: false }).limit(5),
      supabase.from("user_activity_history").select("metadata,created_at").eq("actor_id", user.id).eq("action", "dashboard.quick_action").order("created_at", { ascending: false }).limit(200),
    ]);

    const completedCount = (purchases ?? []).filter((p) => p.status === "completed").length;

    return (
      <div className="container py-8 sm:py-10">
        <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your StudyHub</p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{getGreeting()}, {profile?.full_name || "Student"} 👋</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pendingCount ? `You have ${pendingCount} pending payment${pendingCount === 1 ? "" : "s"} to check.` : savedCount ? `You have ${savedCount} saved resource${savedCount === 1 ? "" : "s"} ready when you need them.` : "Your study space is ready. Find something useful and keep moving."}</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{new Date().toLocaleDateString("en-BD", { weekday: "long", month: "short", day: "numeric" })}</span>
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Quick actions</p><h2 className="mt-1 text-lg font-bold">Pick up where you need</h2></div>
            <p className="text-xs text-muted-foreground">Adapts to your usage</p>
          </div>
          <AdaptiveQuickActions actions={sortAdaptiveActions([
            { id: "browse", label: "Browse resources", href: "/search", icon: Search, tone: "primary" },
            { id: "purchases", label: "My Purchases", href: "/purchases", icon: ShoppingBag },
            { id: "saved", label: "Saved", href: "/saved", icon: Heart },
            { id: "requests", label: "My Requests", href: "/requests", icon: ClipboardList },
            { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
            { id: "tools", label: "Student Tools", href: "/tools", icon: Grid2X2 },
            { id: "history", label: "History", href: "/history", icon: Clock3 },
            { id: "courses", label: "Courses", href: "/courses", icon: BookOpen },
            { id: "account", label: "Profile", href: "/account", icon: Settings2 },
          ], actionCounts(quickActionActivity ?? []))} />
        </section>

        <section className="mt-6">
          <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your activity</p><h2 className="mt-1 text-lg font-bold">A quick snapshot</h2></div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Recent purchases" value={String(purchases?.length ?? 0)} />
          <StatCard icon={<ClockIcon />} label="Pending payments" value={String(pendingCount ?? 0)} />
          <StatCard icon={<Heart className="h-5 w-5" />} label="Saved resources" value={String(savedCount ?? 0)} />
          <StatCard icon={<CheckIcon />} label="Approved resources" value={String(completedCount)} />
          </div>
        </section>

        {purchases?.length ? <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Continue</p><h2 className="mt-1 text-lg font-bold">Pick up where you left off</h2></div><Button asChild variant="ghost" size="sm"><Link href="/purchases">View all</Link></Button></div><div className="mt-4 rounded-2xl border bg-muted/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold">{((purchases[0]?.files as { title?: string | null } | null)?.title) ?? "Your latest resource"}</p><p className="mt-1 text-xs text-muted-foreground">Continue from your latest purchase.</p></div><Button asChild size="sm"><Link href={`/files/${purchases[0]?.file_id}`}>Continue</Link></Button></div></div></section> : null}

        <div className="mt-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Want to earn from your notes?</p>
              <p className="text-sm text-muted-foreground">Become a verified seller and start uploading resources.</p>
            </div>
            <Button asChild variant="secondary"><Link href="/dashboard/become-seller"><Upload className="mr-2 h-4 w-4" />Become a seller</Link></Button>
          </div>
        </div>

        {actionNotifications?.length ? <section className="mt-8 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Action status</p><h2 className="mt-1 text-lg font-bold">Requests & activity</h2><p className="mt-1 text-sm text-muted-foreground">Keep track of items waiting for review or needing attention.</p></div><Button asChild variant="outline" size="sm"><Link href="/notifications">View all</Link></Button></div><div className="mt-4 space-y-2">{actionNotifications.slice(0,4).map((n) => <div key={n.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{n.title}</p><p className="mt-1 text-xs text-muted-foreground">{n.body || "Status update"} · {new Date(n.created_at).toLocaleString()}</p></div>{n.link ? <Button asChild size="sm" variant="outline"><Link href={n.link}>Open</Link></Button> : null}</div>)}</div></section> : null}

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent purchases</h2>
            <Link href="/purchases" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {purchases?.length ? purchases.map((purchase) => {
              const file = purchase.files as { title?: string | null } | null;
              const status = String(purchase.status);
              return (
                <Card key={purchase.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{file?.title ?? "Resource"}</p>
                      <p className="text-sm text-muted-foreground">{formatBDT(purchase.amount_cents)} • {status === "failed" ? "Rejected" : status}</p>
                    </div>
                    <Button asChild size="sm" variant="outline"><Link href={`/files/${purchase.file_id}`}>Open resource</Link></Button>
                  </CardContent>
                </Card>
              );
            }) : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">You haven't purchased anything yet. Start by browsing resources.</CardContent></Card>}
          </div>
        </div>
      </div>
    );
  }

  const { data: myFiles } = await supabase
    .from("files")
    .select("id, title, visibility, pricing_type, price_cents, category, rejection_reason, downloads_count, upload_batch_id")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const adminClient = (await import("@/lib/supabase/server")).createAdminClient();
  const fileIds = (myFiles ?? []).map((file) => file.id);
  const [{ data: saleRows }, { data: payoutRows }, { data: actionNotifications }, { data: quickActionActivity }] = await Promise.all([
    fileIds.length
      ? adminClient.from("purchases").select("id, seller_earning_cents, status, file_id, created_at").in("file_id", fileIds).eq("status", "completed")
      : Promise.resolve({ data: [] as { id: string; seller_earning_cents: number; status: string; file_id: string | null; created_at: string }[] }),
    adminClient.from("payouts").select("amount_cents, status").eq("seller_id", user.id),
    supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).in("type", ["upload_pending","upload_approved","upload_rejected","payout_pending","payout_completed","seller_approved","purchase_pending","purchase_completed","report_update"]).order("created_at", { ascending: false }).limit(8),
    supabase.from("user_activity_history").select("metadata,created_at").eq("actor_id", user.id).eq("action", "dashboard.quick_action").order("created_at", { ascending: false }).limit(200),
  ]);

  const totalEarned = (saleRows ?? []).reduce((sum, sale) => sum + Number(sale.seller_earning_cents ?? 0), 0);
  const completedPayouts = (payoutRows ?? []).filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayouts = (payoutRows ?? []).filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayoutCount = (payoutRows ?? []).filter((p) => p.status === "pending" || p.status === "processing").length;
  const availableBalance = Math.max(0, totalEarned - completedPayouts - pendingPayouts);
  const totalDownloads = (myFiles ?? []).reduce((sum, f) => sum + f.downloads_count, 0);

  return (
    <div className="container py-8 sm:py-10">
      <div className="rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Seller workspace</p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{getGreeting()}, {profile?.full_name || "Seller"} 👋</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{pendingPayoutCount ? `${pendingPayoutCount} payout${pendingPayoutCount === 1 ? " is" : "s are"} waiting for admin payment.` : actionNotifications?.some((n) => n.type === "upload_pending") ? "You have a resource waiting for approval." : totalDownloads ? `Your resources have reached ${totalDownloads} download${totalDownloads === 1 ? "" : "s"}. Keep building your library.` : "Your seller workspace is ready. Upload something useful or check your sales."}</p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Available {formatBDT(availableBalance)}</span>
        </div>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Quick actions</p><h2 className="mt-1 text-lg font-bold">Your most-used shortcuts</h2></div>
          <p className="text-xs text-muted-foreground">Adapts to your usage</p>
        </div>
        <AdaptiveQuickActions actions={sortAdaptiveActions([
          { id: "upload", label: "Upload", href: "/dashboard/upload", icon: Upload, tone: "primary" },
          { id: "sales", label: "Sales & earnings", href: "/dashboard/sales", icon: DollarSign },
          { id: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
          { id: "payment-settings", label: "Payment settings", href: "/dashboard/payment-settings", icon: Wallet },
          { id: "purchases", label: "Purchases", href: "/purchases", icon: ShoppingBag },
          { id: "requests", label: "My Requests", href: "/requests", icon: ClipboardList },
          { id: "tools", label: "Student Tools", href: "/tools", icon: Grid2X2 },
          { id: "history", label: "History", href: "/history", icon: Clock3 },
          { id: "account", label: "Profile", href: "/account", icon: Settings2 },
        ], actionCounts(quickActionActivity ?? []))} />
      </section>

      <section className="mt-6">
        <div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your activity</p><h2 className="mt-1 text-lg font-bold">Earnings & reach</h2></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total earned" value={formatBDT(totalEarned)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Available balance" value={formatBDT(availableBalance)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Pending payout" value={formatBDT(pendingPayouts)} />
        <StatCard icon={<Download className="h-5 w-5" />} label="Total downloads" value={String(totalDownloads)} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Followers" value={String(profile?.followers_count ?? 0)} />
        </div>
      </section>

      {pendingPayoutCount ? <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-200">{pendingPayoutCount} automatic payout{pendingPayoutCount === 1 ? " is" : "s are"} waiting for admin payment.</div> : null}
      {actionNotifications?.length ? <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Action status</p><h2 className="mt-1 text-lg font-bold">Uploads & payouts</h2><p className="mt-1 text-sm text-muted-foreground">See what is waiting for admin review and what has already been resolved.</p></div><Button asChild variant="outline" size="sm"><Link href="/notifications">View all</Link></Button></div><div className="mt-4 space-y-2">{actionNotifications.slice(0,5).map((n) => <div key={n.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{n.title}</p><p className="mt-1 text-xs text-muted-foreground">{n.body || "Status update"} · {new Date(n.created_at).toLocaleString()}</p></div>{n.link ? <Button asChild size="sm" variant="outline"><Link href={n.link}>Open</Link></Button> : null}</div>)}</div></section> : null}

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Your uploads</h2>
        <MyUploadsList files={myFiles ?? []} />
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="border-border/80 bg-card shadow-[0_7px_18px_-13px_rgba(15,23,42,0.5)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="max-w-[78%] text-xs font-medium leading-4 text-muted-foreground sm:text-sm">{label}</CardTitle>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}

function ClockIcon() {
  return <span className="inline-block h-5 w-5 rounded-full border-2 border-current" aria-hidden="true" />;
}

function CheckIcon() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-current text-[10px] font-bold" aria-hidden="true">✓</span>;
}
