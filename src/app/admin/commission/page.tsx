import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { updateDefaultPlatformFee, updateResourcePlatformFee } from "./actions";

export default async function AdminCommissionPage() {
  const admin = createAdminClient();
  const [{ data: settings }, { data: files }] = await Promise.all([
    admin.from("platform_pricing_settings").select("default_fee_cents").eq("id", true).maybeSingle(),
    admin.from("files").select("id,title,price_cents,pricing_type,visibility,seller_id").eq("pricing_type","paid").order("created_at",{ascending:false}).limit(200),
  ]);
  const sellerIds = Array.from(new Set((files ?? []).map(f => f.seller_id)));
  const [{ data: sellers }, { data: overrides }] = await Promise.all([
    sellerIds.length ? admin.from("profiles").select("id,full_name").in("id",sellerIds) : Promise.resolve({ data: [] as {id:string;full_name:string|null}[] }),
    (files ?? []).length ? admin.from("resource_platform_fee_settings").select("file_id,fee_cents").in("file_id",(files ?? []).map(f=>f.id)) : Promise.resolve({ data: [] as {file_id:string;fee_cents:number}[] }),
  ]);
  const sellerMap = new Map((sellers ?? []).map(s=>[s.id,s.full_name]));
  const feeMap = new Map((overrides ?? []).map(o=>[o.file_id,Number(o.fee_cents)]));
  const defaultFee = Number(settings?.default_fee_cents ?? 0);
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Platform Fees</h2><p className="mt-1 text-sm text-muted-foreground">Seller prices stay intact. The platform adds an extra fixed fee paid by the buyer.</p></div>
    <Card><CardHeader><CardTitle>Global default fee</CardTitle></CardHeader><CardContent><form action={updateDefaultPlatformFee} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="space-y-2"><label htmlFor="fee_bdt" className="text-sm font-medium">Extra fee per paid resource (BDT)</label><Input id="fee_bdt" name="fee_bdt" type="number" min="0" max="1000" step="1" defaultValue={(defaultFee/100).toFixed(0)} className="w-48" /></div><Button type="submit">Save default fee</Button></form><p className="mt-3 text-xs text-muted-foreground">Example: Seller price ৳50 + platform fee ৳10 = buyer pays ৳60. Seller earns ৳50 and platform keeps ৳10.</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Per-resource overrides</CardTitle></CardHeader><CardContent className="space-y-3">{(files ?? []).map(f => <div key={f.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{f.title}</p><p className="text-sm text-muted-foreground">{sellerMap.get(f.seller_id) ?? "Uploader"} · Seller price {formatBDT(f.price_cents)} · {f.visibility}</p><p className="mt-1 text-xs text-muted-foreground">Buyer price now: {formatBDT(f.price_cents + (feeMap.get(f.id) ?? defaultFee))}</p></div><form action={updateResourcePlatformFee} className="flex flex-wrap items-center gap-2"><input type="hidden" name="file_id" value={f.id}/><Input name="fee_bdt" type="number" min="0" max="1000" step="1" defaultValue={(feeMap.get(f.id) ?? defaultFee)/100} className="w-32"/><span className="text-sm">BDT</span><Button type="submit" size="sm">Save</Button></form></div></div>)}{!files?.length && <p className="text-sm text-muted-foreground">No paid resources yet.</p>}</CardContent></Card>
  </div>;
}
