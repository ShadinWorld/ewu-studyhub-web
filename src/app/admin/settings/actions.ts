"use server";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMarketplaceSettings(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const number = String(formData.get("bkash_number") ?? "").trim();
  const commissionType = String(formData.get("commission_type") ?? "percentage");
  const percent = Number(formData.get("default_commission_percent") ?? 0);
  const fixedTaka = Number(formData.get("default_commission_amount") ?? 0);

  if (!/^01\d{9}$/.test(number)) throw new Error("Enter a valid 11-digit bKash number.");
  if (!["percentage", "fixed_amount"].includes(commissionType)) throw new Error("Invalid commission type.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Commission percentage must be between 0 and 100.");
  if (!Number.isFinite(fixedTaka) || fixedTaka < 0) throw new Error("Fixed commission cannot be negative.");

  const { error } = await supabase.rpc("update_platform_payment_settings", {
    p_bkash_number: number,
    p_commission_type: commissionType as "percentage" | "fixed_amount",
    p_default_commission_percent: percent,
    p_default_commission_amount_cents: Math.round(fixedTaka * 100),
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "settings.payment_update",
    target_table: "platform_payment_settings",
    metadata: {
      payment_method: "bkash",
      commission_type: commissionType,
      commission_percent: percent,
      fixed_amount_taka: fixedTaka,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  revalidatePath("/admin/payouts");
  redirect("/admin/settings?saved=Marketplace%20settings%20saved");
}
