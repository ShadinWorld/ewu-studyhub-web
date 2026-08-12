import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: revenueRows } = await supabase
    .from("purchases")
    .select("commission_cents")
    .eq("status", "completed");
  const totalCommission = (revenueRows ?? []).reduce((sum, r) => sum + r.commission_cents, 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Pending uploads" value={String(pendingCount ?? 0)} highlight={(pendingCount ?? 0) > 0} />
      <StatCard label="Published files" value={String(publishedCount ?? 0)} />
      <StatCard label="Open reports" value={String(reportCount ?? 0)} highlight={(reportCount ?? 0) > 0} />
      <StatCard label="Pending seller requests" value={String(sellerReqCount ?? 0)} highlight={(sellerReqCount ?? 0) > 0} />
      <StatCard label="Payment requests" value={String(paymentReqCount ?? 0)} highlight={(paymentReqCount ?? 0) > 0} />
      <StatCard label="Payout requests" value={String(payoutReqCount ?? 0)} highlight={(payoutReqCount ?? 0) > 0} />
      <StatCard label="Total users" value={String(userCount ?? 0)} />
      <StatCard label="Platform commission earned" value={formatBDT(totalCommission)} />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
