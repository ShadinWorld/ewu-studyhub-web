import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateResourceCommission } from "./actions";

export default async function AdminCommissionPage() {
  const supabase = createClient();
  const [{ data: files }, { data: settings }] = await Promise.all([
    supabase.from("files").select("id, title, price_cents, visibility, seller_id").eq("pricing_type", "paid").order("created_at", { ascending: false }).limit(100),
    supabase.from("resource_commission_settings").select("file_id, commission_percent"),
  ]);
  const sellerIds = Array.from(new Set((files ?? []).map(f => f.seller_id)));
  const { data: sellers } = sellerIds.length ? await supabase.from("profiles").select("id, full_name").in("id", sellerIds) : { data: [] };
  const sellerMap = new Map((sellers ?? []).map(s => [s.id, s]));
  const settingMap = new Map((settings ?? []).map(s => [s.file_id, s.commission_percent]));
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Resource Commission</h2><p className="text-muted-foreground">Set an optional resource-specific platform commission. Leave blank to use the global default.</p></div><div className="space-y-3">{files?.map(f => { const seller = sellerMap.get(f.seller_id); return <Card key={f.id}><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{f.title}</p><p className="text-sm text-muted-foreground">{seller?.full_name ?? "Seller"} • {(f.price_cents / 100).toFixed(2)} BDT • {f.visibility}</p></div><form action={updateResourceCommission} className="flex items-center gap-2"><input type="hidden" name="file_id" value={f.id} /><Input className="w-32" name="commission_percent" type="number" min="0" max="100" step="0.01" placeholder="Default" defaultValue={settingMap.get(f.id) ?? ""} /><span className="text-sm">%</span><Button type="submit" size="sm">Save</Button></form></CardContent></Card>; })}</div></div>;
}
