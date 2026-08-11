import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateMarketplaceSettings } from "./actions";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const { data: settings } = await supabase.from("platform_payment_settings").select("bkash_number, default_commission_percent").eq("id", true).single();
  return <div className="max-w-2xl space-y-6"><div><h2 className="text-2xl font-bold">Marketplace Settings</h2><p className="text-muted-foreground">Admin-only payment and commission controls.</p></div><Card><CardHeader><CardTitle>Manual bKash</CardTitle><CardDescription>The bKash number shown to buyers at checkout.</CardDescription></CardHeader><CardContent><form action={updateMarketplaceSettings} className="space-y-4"><div className="space-y-2"><Label htmlFor="bkash_number">Platform bKash number</Label><Input id="bkash_number" name="bkash_number" defaultValue={settings?.bkash_number ?? "01716529460"} required /></div><div className="space-y-2"><Label htmlFor="default_commission_percent">Default platform commission (%)</Label><Input id="default_commission_percent" name="default_commission_percent" type="number" min="0" max="100" step="0.01" defaultValue={settings?.default_commission_percent ?? 20} required /><p className="text-xs text-muted-foreground">This is private to admins. A resource can override it with its own commission percentage.</p></div><Button type="submit">Save settings</Button></form></CardContent></Card></div>;
}
