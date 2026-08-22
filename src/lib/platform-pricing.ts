import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPlatformPricing(supabase: SupabaseClient<any>) {
  const { data: settings } = await supabase.from("platform_pricing_settings").select("default_fee_cents").eq("id", true).maybeSingle();
  return Number(settings?.default_fee_cents ?? 0);
}

export async function getResourceFeeMap(supabase: SupabaseClient<any>, fileIds: string[]) {
  const map = new Map<string, number>();
  if (!fileIds.length) return map;
  const { data } = await supabase.from("resource_platform_fee_settings").select("file_id, fee_cents").in("file_id", fileIds);
  for (const row of data ?? []) map.set(row.file_id, Number(row.fee_cents));
  return map;
}

export async function getBuyerPriceCents(supabase: SupabaseClient<any>, fileId: string, sellerPriceCents: number) {
  const feeMap = await getResourceFeeMap(supabase, [fileId]);
  const fee = feeMap.get(fileId) ?? await getPlatformPricing(supabase);
  return sellerPriceCents + fee;
}
