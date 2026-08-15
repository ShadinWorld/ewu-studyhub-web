"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approvePayment(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const purchaseId = String(formData.get("purchase_id") ?? "");
  const { error } = await supabase.rpc("approve_manual_bkash_purchase", { p_purchase_id: purchaseId });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "payment.approve", target_table: "purchases", target_id: purchaseId });
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  revalidatePath("/purchases");
}

export async function rejectPayment(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const purchaseId = String(formData.get("purchase_id") ?? "");
  const reason = String(formData.get("reason") ?? "Payment could not be verified.");
  const { error } = await supabase.rpc("reject_manual_bkash_purchase", { p_purchase_id: purchaseId, p_reason: reason });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "payment.reject", target_table: "purchases", target_id: purchaseId, metadata: { reason } });
  revalidatePath("/admin/payments");
  revalidatePath("/purchases");
}
