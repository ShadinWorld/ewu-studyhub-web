import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { completePayout, rejectPayout } from "./actions";

export default async function AdminPayoutsPage() {
  const supabase = createClient();
  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, seller_id, amount_cents, status, payment_method, payment_account_number, created_at, processed_at, profiles(full_name, username)")
    .order("created_at", { ascending: false });

  const rows = payouts ?? [];
  const pending = rows.filter(p => p.status === "pending");
  const processing = rows.filter(p => p.status === "processing");
  const completed = rows.filter(p => p.status === "completed");

  return <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold">Seller Payouts</h2>
      <p className="text-muted-foreground">Verify the seller, bKash number and amount, then mark the manual payment completed.</p>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <Mini label="Pending" value={String(pending.length)} />
      <Mini label="Processing" value={String(processing.length)} />
      <Mini label="Completed" value={String(completed.length)} />
    </div>
    {rows.length ? <div className="space-y-3">{rows.map(p => {
      const seller = p.profiles as { full_name?: string; username?: string } | null;
      const isPending = p.status === "pending";
      return <Card key={p.id} className={isPending ? "border-amber-500/30" : ""}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{seller?.full_name ?? seller?.username ?? p.seller_id}</p>
                <Badge variant={isPending ? "secondary" : "outline"} className="capitalize">{p.status}</Badge>
              </div>
              <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <span>Amount: <strong className="text-foreground">{formatBDT(p.amount_cents)}</strong></span>
                <span>Method: {p.payment_method ?? "—"}</span>
                <span>bKash: {p.payment_account_number ?? "—"}</span>
                <span>Requested: {new Date(p.created_at).toLocaleString()}</span>
              </div>
            </div>
            {isPending && <div className="flex flex-col gap-2 sm:flex-row lg:w-[420px]">
              <form action={completePayout} className="shrink-0"><input type="hidden" name="payout_id" value={p.id} /><Button type="submit">Mark paid</Button></form>
              <form action={rejectPayout} className="flex flex-1 gap-2"><input type="hidden" name="payout_id" value={p.id} /><Input name="reason" placeholder="Reason (optional)" /><Button type="submit" variant="outline">Reject</Button></form>
            </div>}
          </div>
        </CardContent>
      </Card>;
    })}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No payout requests.</CardContent></Card>}
  </div>;
}

function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
