import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { completePayout } from "./actions";

export default async function AdminPayoutsPage() {
  const supabase = createClient();
  const { data: payouts } = await supabase.from("payouts").select("id, seller_id, amount_cents, status, payment_method, payment_account_number, created_at, profiles(full_name, username)").order("created_at", { ascending: false });
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Seller Payouts</h2><p className="text-muted-foreground">Pay sellers manually through their saved bKash number, then mark the payout completed.</p></div>{payouts?.length ? <div className="space-y-3">{payouts.map(p => { const seller = p.profiles as { full_name?: string; username?: string } | null; return <Card key={p.id}><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{seller?.full_name ?? seller?.username ?? p.seller_id}</p><p className="text-sm text-muted-foreground">{formatBDT(p.amount_cents)} • bKash: {p.payment_account_number ?? "—"}</p><p className="text-xs text-muted-foreground capitalize">{p.status}</p></div>{p.status === "pending" && <form action={completePayout}><input type="hidden" name="payout_id" value={p.id} /><Button type="submit">Mark paid</Button></form>}</CardContent></Card>})}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No payout requests.</CardContent></Card>}</div>;
}
