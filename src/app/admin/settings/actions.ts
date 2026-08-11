"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMarketplaceSettings(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const number = String(formData.get("bkash_number") ?? "").trim();
  const percent = Number(formData.get("default_commission_percent"));
  if (!/^01\d{9}$/.test(number)) throw new Error("Enter a valid 11-digit bKash number.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Commission must be between 0 and 100.");
  const { error } = await supabase.rpc("update_platform_payment_settings", { p_bkash_number: number, p_default_commission_percent: percent });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}
