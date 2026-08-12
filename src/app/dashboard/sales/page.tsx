import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, ShoppingBag, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export default async function SellerSalesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/sales");

  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "seller") redirect("/dashboard");

  const { data: sales } = await supabase
    .from("purchases")
    .select("id, file_id, buyer_id, amount_cents, seller_earning_cents, commission_cents, status, payment_method, payment_reference, created_at, payment_submitted_at, approved_at, files(title), profiles!purchases_buyer_id_fkey(full_name, username)")
    .in("file_id", (await supabase.from("files").select("id").eq("seller_id", user.id)).data?.map(f => f.id) ?? [])
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = sales ?? [];
  const completed = rows.filter(r => r.status === "completed");
  const pending = rows.filter(r => r.status === "pending");
  const totalSales = completed.reduce((sum, r) => sum + r.amount_cents, 0);
  const totalEarnings = completed.reduce((sum, r) => sum + r.seller_earning_cents, 0);

  return (
    <div className="container max-w-5xl py-8 sm:py-10">
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-primary">Seller workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Sales & Earnings</h1>
        <p className="mt-2 text-sm text-muted-foreground">See every sale, your 80% earning, payment status, and buyer transaction reference in one place.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Completed sales" value={String(completed.length)} />
        <Stat label="Pending payments" value={String(pending.length)} />
        <Stat label="Gross sales" value={formatBDT(totalSales)} />
        <Stat label="Your earnings" value={formatBDT(totalEarnings)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><Link href="/dashboard/payment-settings">Wallet & payout</Link></Button>
        <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
      </div>

      <div className="mt-8 space-y-3">
        {rows.length ? rows.map((sale) => {
          const file = sale.files as { title?: string | null } | null;
          const buyer = sale.profiles as { full_name?: string | null; username?: string | null } | null;
          const buyerName = buyer?.full_name || buyer?.username || "Student";
          const completedSale = sale.status === "completed";
          const pendingSale = sale.status === "pending";
          const failedSale = sale.status === "failed";
          return (
            <Card key={sale.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{file?.title ?? "Resource"}</p>
                      {completedSale && <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" />Completed</Badge>}
                      {pendingSale && <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500"><Clock3 className="h-3 w-3" />Payment pending</Badge>}
                      {failedSale && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <span>Student: {buyerName}</span>
                      <span>Gross: {formatBDT(sale.amount_cents)}</span>
                      <span>Your earning: {formatBDT(sale.seller_earning_cents)}</span>
                      <span>Commission: {formatBDT(sale.commission_cents)}</span>
                      <span>Method: {String(sale.payment_method ?? "—")}</span>
                      <span>Transaction: {String(sale.payment_reference ?? "—")}</span>
                    </div>
                  </div>
                  {sale.file_id && <Button asChild size="sm" variant="outline"><Link href={`/files/${sale.file_id}`}>View resource</Link></Button>}
                </div>
              </CardContent>
            </Card>
          );
        }) : <Card><CardHeader><CardTitle>No sales yet</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">When students purchase your resources, every sale will appear here.</CardContent></Card>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p></CardContent></Card>;
}
