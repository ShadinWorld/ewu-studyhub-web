import { redirect } from "next/navigation";
import { DollarSign, Download, Eye, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MyUploadsList } from "@/components/files/my-uploads-list";
import { formatBDT } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: myFiles } = await supabase
    .from("files")
    .select("id, title, visibility, pricing_type, price_cents, category, rejection_reason, downloads_count")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const { data: purchaseAgg } = await supabase
    .from("purchases")
    .select("seller_earning_cents, file_id, files!inner(seller_id)")
    .eq("files.seller_id", user.id)
    .eq("status", "completed");

  const totalRevenue = (purchaseAgg ?? []).reduce((sum, p: any) => sum + p.seller_earning_cents, 0);
  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");

  const totalDownloads = (myFiles ?? []).reduce((sum, f) => sum + f.downloads_count, 0);
  const totalViews = 0; // views tracked in file_daily_stats — join left as a future query

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Seller Dashboard</h1>
      <p className="text-muted-foreground">Welcome back, {profile?.full_name}.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total revenue" value={formatBDT(totalRevenue)} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Wallet balance" value={formatBDT(profile?.wallet_balance_cents ?? 0)} />
        <StatCard icon={<Download className="h-5 w-5" />} label="Total downloads" value={String(totalDownloads)} />
        <StatCard icon={<Eye className="h-5 w-5" />} label="Followers" value={String(profile?.followers_count ?? 0)} />
      </div>

      {!isSeller && (
        <div className="mt-6 rounded-lg border bg-accent/40 p-4">
          <p className="text-sm font-medium">You're not a verified seller yet</p>
          <p className="text-sm text-muted-foreground">
            Verify your EWU student ID to start uploading and selling resources.
          </p>
          <a href="/dashboard/become-seller" className="mt-2 inline-block text-sm font-medium text-primary underline">
            Become a seller →
          </a>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isSeller && <a href="/dashboard/payment-settings" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Payment Settings</a>}
        <a href="/purchases" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">My Purchases</a>
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
