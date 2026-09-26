import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { saveBkashNumber } from "./actions";
import { CopyButton } from "@/components/shared/copy-button";

export default async function PaymentSettingsPage({ searchParams }: { searchParams?: { saved?: string; error?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/payment-settings");
  const { data: profile } = await supabase.from("profiles").select("is_seller, role, wallet_balance_cents, seller_bkash_number").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "seller") redirect("/dashboard/become-seller");
  const { data: settings } = await supabase.from("seller_payment_settings").select("bkash_number").eq("seller_id", user.id).maybeSingle();
  const admin = (await import("@/lib/supabase/server")).createAdminClient();
  const { data: sellerFiles } = await admin.from("files").select("id").eq("seller_id", user.id);
  const sellerFileIds = (sellerFiles ?? []).map((f) => f.id);
  const [{ data: sales }, { data: payouts }] = await Promise.all([
    sellerFileIds.length ? admin.from("purchases").select("amount_cents,seller_earning_cents,commission_cents,status").in("file_id", sellerFileIds) : Promise.resolve({ data: [] as any[] }),
    admin.from("payouts").select("id, amount_cents, status, payment_method, payment_account_number, created_at, processed_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20)
  ]);
  const completedSales = (sales ?? []).filter((s:any) => s.status === "completed");
  const totalEarned = completedSales.reduce((sum:number, r:any) => sum + Number(r.seller_earning_cents ?? 0), 0);
  const completedPaid = (payouts ?? []).filter((p:any) => p.status === "completed").reduce((sum:number, p:any) => sum + Number(p.amount_cents ?? 0), 0);
  const pendingPayouts = (payouts ?? []).filter((p:any) => p.status === "pending" || p.status === "processing").reduce((sum:number, p:any) => sum + Number(p.amount_cents ?? 0), 0);
  const availableBalance = Math.max(0, totalEarned - completedPaid - pendingPayouts);

  return <div className="container max-w-3xl py-10 space-y-6">
    <div><h1 className="text-2xl font-bold">Payment Settings</h1><p className="text-muted-foreground">Manage where you receive seller payouts.</p>{searchParams?.saved ? <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}{searchParams?.error ? <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">{searchParams.error}</p> : null}</div>
    <Card>
      <CardHeader>
        <CardTitle>Earnings পাওয়ার bKash Number</CardTitle>
        <CardDescription>আপনার Resource বিক্রি হলে যে bKash নম্বরে earnings পেতে চান, সেই নম্বরটি দিন।</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={saveBkashNumber} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bkash_number">bKash Number</Label>
            <Input id="bkash_number" name="bkash_number" defaultValue={settings?.bkash_number ?? profile?.seller_bkash_number ?? ""} placeholder="01XXXXXXXXX" inputMode="numeric" required />
          </div>
          <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            <p><span className="font-semibold text-foreground">ⓘ এই নম্বরটি কেন লাগছে?</span> Resource বিক্রি হলে approved earnings এই bKash নম্বরে পাঠানোর জন্য এটি ব্যবহার করা হবে।</p>
            <p className="mt-2"><span className="font-semibold text-foreground">🔒 নিরাপত্তা:</span> bKash PIN, OTP বা password কখনোই এখানে দেবেন না।</p>
          </div>
          <Button type="submit">Save bKash Number</Button>
        </form>
      </CardContent>
    </Card>
    <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><p className="font-semibold">Automatic payouts</p><p className="mt-1 text-sm text-muted-foreground">You do not need to request payouts manually. When a buyer payment is approved, your seller earnings automatically create a payout for admin review and payment.</p><p className="mt-3 text-sm font-medium">Total earned: {formatBDT(totalEarned)} · Available balance: {formatBDT(availableBalance)} · Automatic payout pending: {formatBDT(pendingPayouts)}</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Automatic payout history</CardTitle></CardHeader><CardContent>{payouts?.length ? <div className="divide-y">{payouts.map(p => <div key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{formatBDT(p.amount_cents)}</p><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>bKash • {p.payment_account_number ?? "Not saved yet"}</span>{p.payment_account_number && <CopyButton value={p.payment_account_number} label="Copy number" />}</div></div><span className="text-sm capitalize">{p.status}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No automatic payouts yet.</p>}</CardContent></Card>
  </div>;
}
