import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CreditCard, Activity, Users, Wallet } from "lucide-react";
import { updateMarketplaceSettings } from "./actions";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const [{ data: settings }, { data: logs }] = await Promise.all([
    supabase.from("platform_payment_settings").select("bkash_number, default_commission_percent, commission_type, default_commission_amount_cents").eq("id", true).single(),
    supabase.from("audit_logs").select("id, action, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)").order("created_at", { ascending: false }).limit(20),
  ]);
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">Control center</p><h2 className="text-2xl font-bold">Settings & security</h2><p className="mt-1 text-sm text-muted-foreground">bKash-only payments, automatic seller payouts and marketplace controls.</p></div>
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="p-5"><CreditCard className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">bKash only</p><p className="mt-1 text-xs text-muted-foreground">No Nagad, Rocket or card checkout is enabled.</p></CardContent></Card>
      <Card><CardContent className="p-5"><Wallet className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Automatic seller payouts</p><p className="mt-1 text-xs text-muted-foreground">Approved sales automatically create a payout for the seller.</p></CardContent></Card>
      <Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Role protection</p><p className="mt-1 text-xs text-muted-foreground">Only super admins can grant admin or super admin roles.</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Marketplace payment settings</CardTitle><CardDescription>Choose whether the platform fee is a percentage or a fixed amount. The selected rule is snapshotted into each approved sale.</CardDescription></CardHeader><CardContent>
      <form action={updateMarketplaceSettings} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="bkash_number">Platform bKash number</Label><Input id="bkash_number" name="bkash_number" inputMode="numeric" pattern="01[0-9]{9}" maxLength={11} defaultValue={settings?.bkash_number ?? "01716529460"} required /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="commission_type">Commission type</Label><select id="commission_type" name="commission_type" defaultValue={settings?.commission_type ?? "percentage"} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select></div>
          <div className="space-y-2"><Label htmlFor="default_commission_percent">Percentage (%)</Label><Input id="default_commission_percent" name="default_commission_percent" type="number" min="0" max="100" step="0.01" defaultValue={settings?.default_commission_percent ?? 20} /></div>
          <div className="space-y-2"><Label htmlFor="default_commission_amount">Fixed platform fee (BDT)</Label><Input id="default_commission_amount" name="default_commission_amount" type="number" min="0" step="1" defaultValue={((settings?.default_commission_amount_cents ?? 0) / 100).toFixed(0)} /></div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><strong>Example:</strong> ৳100 sale with percentage 10% → platform ৳10, seller ৳90. With fixed fee ৳10 → platform ৳10, seller ৳90.</div>
        <Button type="submit">Save marketplace settings</Button>
      </form>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Admin activity log</CardTitle><CardDescription>Recent role, seller and marketplace actions.</CardDescription></CardHeader><CardContent className="space-y-2">{logs?.length ? logs.map((log: any) => <div key={log.id} className="flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium">{String(log.action).replaceAll(".", " ")}</p><p className="text-xs text-muted-foreground">{log.actor?.full_name ?? "System"} · {new Date(log.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No activity yet.</p>}</CardContent></Card>
    <Card><CardContent className="p-5"><Users className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">User management</p><p className="mt-1 text-sm text-muted-foreground"><Link className="text-primary underline" href="/admin/users">Open Users & roles</Link> to view profiles, contact users, manage status and permissions.</p></CardContent></Card>
  </div>;
}
