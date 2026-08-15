"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, adminId: user.id };
}

export async function completePayout(formData: FormData) {
  const { supabase, adminId } = await requireAdmin();
  const payoutId = String(formData.get("payout_id") ?? "");
  const { error } = await supabase.rpc("complete_seller_payout", { p_payout_id: payoutId });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "payout.complete", target_table: "payouts", target_id: payoutId });
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payment-settings");
  revalidatePath("/dashboard");
}

export async function rejectPayout(formData: FormData) {
  const { supabase, adminId } = await requireAdmin();
  const payoutId = String(formData.get("payout_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const rpc = supabase.rpc as unknown as (name: "reject_seller_payout", args: { p_payout_id: string; p_reason: string }) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("reject_seller_payout", { p_payout_id: payoutId, p_reason: reason });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "payout.reject", target_table: "payouts", target_id: payoutId, metadata: { reason } });
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payment-settings");
}
