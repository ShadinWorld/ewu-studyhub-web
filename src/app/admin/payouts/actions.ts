"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function completePayout(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const payoutId = String(formData.get("payout_id") ?? "");
  const { error } = await supabase.rpc("complete_seller_payout", { p_payout_id: payoutId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard/payment-settings");
  revalidatePath("/dashboard");
}
