import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, Download, Eye, Heart, ShoppingBag, Wallet, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyUploadsList } from "@/components/files/my-uploads-list";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserGuideButton } from "@/components/guides/user-guide-button";

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
    const [{ data: purchases }, { count: savedCount }, { count: pendingCount }, { data: actionNotifications }] = await Promise.all([
      supabase
        .from("purchases")
        .select("id, file_id, amount_cents, status, files(title)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("wishlists").select("file_id", { count: "exact", head: true }).eq("profile_id", user.id),
      supabase.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "pending"),
      supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).in("type", ["seller_verification_pending","resource_request_update","purchase_pending","purchase_completed","report_update"]).order("created_at", { ascending: false }).limit(5),
    ]);

    const completedCount = (purchases ?? []).filter((p) => p.status === "completed").length;

    return (
      <div className="container py-8 sm:py-10">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-primary">Your StudyHub</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {profile?.full_name || "Student"} 👋</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Everything important is one tap away: purchases, saved resources, notifications and your seller journey.</p>
        </div>

        <div className="mt-6 flex justify-end"><UserGuideButton /></div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Recent purchases" value={String(purchases?.length ?? 0)} />
          <StatCard icon={<ClockIcon />} label="Pending payments" value={String(pendingCount ?? 0)} />
          <StatCard icon={<Heart className="h-5 w-5" />} label="Saved resources" value={String(savedCount ?? 0)} />
          <StatCard icon={<CheckIcon />} label="Approved in recent list" value={String(completedCount)} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button asChild className="h-12"><Link href="/search">Browse resources</Link></Button>
          <Button asChild variant="outline" className="h-12"><Link href="/purchases">My Purchases</Link></Button>
          <Button asChild variant="outline" className="h-12"><Link href="/saved">Saved</Link></Button>
          <Button asChild variant="outline" className="h-12"><Link href="/requests">My Requests</Link></Button>
          <Button asChild variant="outline" className="relative h-12"><Link href="/notifications">Notifications{actionNotifications?.some((n) => !n.is_read) ? <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{actionNotifications.filter((n) => !n.is_read).length}</span> : null}</Link></Button>
          <Button asChild variant="outline" className="h-12"><Link href="/tools">Student Tools</Link></Button><Button asChild variant="outline" className="h-12"><Link href="/history">History</Link></Button>
        </div>

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
  const [{ data: saleRows }, { data: payoutRows }, { data: actionNotifications }] = await Promise.all([
    fileIds.length
      ? adminClient.from("purchases").select("id, seller_earning_cents, status, file_id, created_at").in("file_id", fileIds).eq("status", "completed")
      : Promise.resolve({ data: [] as { id: string; seller_earning_cents: number; status: string; file_id: string | null; created_at: string }[] }),
    adminClient.from("payouts").select("amount_cents, status").eq("seller_id", user.id),
    supabase.from("notifications").select("id,type,title,body,created_at,is_read,link").eq("profile_id", user.id).in("type", ["upload_pending","upload_approved","upload_rejected","payout_pending","payout_completed","seller_approved","purchase_pending","purchase_completed","report_update"]).order("created_at", { ascending: false }).limit(8),
  ]);

  const totalEarned = (saleRows ?? []).reduce((sum, sale) => sum + Number(sale.seller_earning_cents ?? 0), 0);
  const completedPayouts = (payoutRows ?? []).filter((p) => p.status === "completed").reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayouts = (payoutRows ?? []).filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayoutCount = (payoutRows ?? []).filter((p) => p.status === "pending" || p.status === "processing").length;
  const availableBalance = Math.max(0, totalEarned - completedPayouts - pendingPayouts);
  const totalDownloads = (myFiles ?? []).reduce((sum, f) => sum + f.downloads_count, 0);

  return (
    <div className="container py-8 sm:py-10">
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-primary">Seller workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {profile?.full_name || "Seller"} 💰</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track sales, earnings, uploads and payouts without hunting through menus.</p>
      </div>

      <div className="mt-6 flex justify-end"><UserGuideButton /></div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total earned" value={formatBDT(totalEarned)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Available balance" value={formatBDT(availableBalance)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Pending payout" value={formatBDT(pendingPayouts)} />
        <StatCard icon={<Download className="h-5 w-5" />} label="Total downloads" value={String(totalDownloads)} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Followers" value={String(profile?.followers_count ?? 0)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button asChild className="h-12 bg-emerald-600 text-white hover:bg-emerald-700"><Link href="/dashboard/upload"><Upload className="mr-2 h-4 w-4" />Upload</Link></Button>
        <Button asChild variant="outline" className="h-12"><Link href="/dashboard/sales">Sales & earnings</Link></Button>
        <Button asChild variant="outline" className="h-12"><Link href="/dashboard/payment-settings">Payment settings</Link></Button>
        <Button asChild variant="outline" className="h-12"><Link href="/purchases">Purchases</Link></Button>
        <Button asChild variant="outline" className="h-12"><Link href="/requests">My Requests</Link></Button>
        <Button asChild variant="outline" className="h-12"><Link href="/notifications">Notifications</Link></Button>
          <Button asChild variant="outline" className="h-12"><Link href="/tools">Student Tools</Link></Button><Button asChild variant="outline" className="h-12"><Link href="/history">History</Link></Button>
      </div>
      {pendingPayoutCount ? <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-200">{pendingPayoutCount} automatic payout{pendingPayoutCount === 1 ? " is" : "s are"} waiting for admin payment.</div> : null}
      {actionNotifications?.length ? <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Action status</p><h2 className="mt-1 text-lg font-bold">Uploads & payouts</h2><p className="mt-1 text-sm text-muted-foreground">See what is waiting for admin review and what has already been resolved.</p></div><Button asChild variant="outline" size="sm"><Link href="/notifications">View all</Link></Button></div><div className="mt-4 space-y-2">{actionNotifications.slice(0,5).map((n) => <div key={n.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{n.title}</p><p className="mt-1 text-xs text-muted-foreground">{n.body || "Status update"} · {new Date(n.created_at).toLocaleString()}</p></div>{n.link ? <Button asChild size="sm" variant="outline"><Link href={n.link}>Open</Link></Button> : null}</div>)}</div></section> : null}

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Your uploads</h2>
        <MyUploadsList files={myFiles ?? []} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
