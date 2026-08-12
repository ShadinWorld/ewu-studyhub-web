import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, Download, Eye, Heart, ShoppingBag, Wallet, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyUploadsList } from "@/components/files/my-uploads-list";
import { formatBDT } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");

  if (!isSeller) {
    const [{ data: purchases }, { count: savedCount }, { count: pendingCount }] = await Promise.all([
      supabase
        .from("purchases")
        .select("id, file_id, amount_cents, status, files(title)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("wishlists").select("file_id", { count: "exact", head: true }).eq("profile_id", user.id),
      supabase.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "pending"),
    ]);

    const completedCount = (purchases ?? []).filter((p) => p.status === "completed").length;

    return (
      <div className="container py-10">
        <div>
          <h1 className="text-2xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name}.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Recent purchases" value={String(purchases?.length ?? 0)} />
          <StatCard icon={<ClockIcon />} label="Pending payments" value={String(pendingCount ?? 0)} />
          <StatCard icon={<Heart className="h-5 w-5" />} label="Saved resources" value={String(savedCount ?? 0)} />
          <StatCard icon={<CheckIcon />} label="Approved in recent list" value={String(completedCount)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link href="/search">Browse resources</Link></Button>
          <Button asChild variant="outline"><Link href="/purchases">My Purchases</Link></Button>
          <Button asChild variant="outline"><Link href="/saved">Saved</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/become-seller"><Upload className="mr-2 h-4 w-4" />Become a seller</Link></Button>
        </div>

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

  const [{ data: myFiles }, { data: purchaseAgg }, { count: pendingPayoutCount }] = await Promise.all([
    supabase
      .from("files")
      .select("id, title, visibility, pricing_type, price_cents, category, rejection_reason, downloads_count")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select("seller_earning_cents, file_id, files!inner(seller_id)")
      .eq("files.seller_id", user.id)
      .eq("status", "completed"),
    supabase.from("payouts").select("id", { count: "exact", head: true }).eq("seller_id", user.id).eq("status", "pending"),
  ]);

  const totalRevenue = (purchaseAgg ?? []).reduce((sum, p: any) => sum + p.seller_earning_cents, 0);
  const totalDownloads = (myFiles ?? []).reduce((sum, f) => sum + f.downloads_count, 0);

  return (
    <div className="container py-10">
      <div>
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name}.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total revenue" value={formatBDT(totalRevenue)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Wallet balance" value={formatBDT(profile?.wallet_balance_cents ?? 0)} />
        <StatCard icon={<Download className="h-5 w-5" />} label="Total downloads" value={String(totalDownloads)} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Followers" value={String(profile?.followers_count ?? 0)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild><Link href="/dashboard/upload"><Upload className="mr-2 h-4 w-4" />Upload resource</Link></Button>
        <Button asChild variant="outline"><Link href="/dashboard/payment-settings">Payment Settings</Link></Button>
        <Button asChild variant="outline"><Link href="/purchases">My Purchases</Link></Button>
        <Button asChild variant="outline"><Link href="/notifications">Notifications</Link></Button>
        {pendingPayoutCount ? <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm text-amber-600">{pendingPayoutCount} payout pending</span> : null}
      </div>

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
