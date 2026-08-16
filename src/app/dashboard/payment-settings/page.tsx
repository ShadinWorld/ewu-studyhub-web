import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { saveBkashNumber } from "./actions";

export default async function PaymentSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/payment-settings");
  const { data: profile } = await supabase.from("profiles").select("is_seller, role, wallet_balance_cents").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "seller") redirect("/dashboard/become-seller");
  const { data: settings } = await supabase.from("seller_payment_settings").select("bkash_number").eq("seller_id", user.id).maybeSingle();
  const { data: payouts } = await supabase.from("payouts").select("id, amount_cents, status, payment_method, payment_account_number, created_at, processed_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(10);

  return <div className="container max-w-3xl py-10 space-y-6">
    <div><h1 className="text-2xl font-bold">Payment Settings</h1><p className="text-muted-foreground">Manage where you receive seller payouts.</p></div>
    <Card><CardHeader><CardTitle>Seller bKash number</CardTitle><CardDescription>This number is used by admins when paying your approved earnings.</CardDescription></CardHeader><CardContent><form action={saveBkashNumber} className="flex gap-3"><div className="flex-1 space-y-2"><Label htmlFor="bkash_number">bKash number</Label><Input id="bkash_number" name="bkash_number" defaultValue={settings?.bkash_number ?? ""} placeholder="01XXXXXXXXX" required /></div><Button type="submit" className="mt-8">Save</Button></form></CardContent></Card>
    <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><p className="font-semibold">Automatic payouts</p><p className="mt-1 text-sm text-muted-foreground">You do not need to request payouts manually. When a buyer payment is approved, your seller earnings automatically create a payout for admin review and payment.</p><p className="mt-3 text-sm font-medium">Current available wallet balance: {formatBDT(profile.wallet_balance_cents)}</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Payout history</CardTitle></CardHeader><CardContent>{payouts?.length ? <div className="divide-y">{payouts.map(p => <div key={p.id} className="flex items-center justify-between py-3"><div><p className="font-medium">{formatBDT(p.amount_cents)}</p><p className="text-xs text-muted-foreground">bKash • {p.payment_account_number}</p></div><span className="text-sm capitalize">{p.status}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No payouts yet.</p>}</CardContent></Card>
  </div>;
}
