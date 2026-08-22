"use server";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, adminId: user.id };
}

export async function completePayout(formData: FormData) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const payoutId = String(formData.get("payout_id") ?? "");
    if (!payoutId) redirect("/admin/payouts?error=Invalid%20payout%20ID");
    const { data: payoutBefore } = await supabase.from("payouts").select("seller_id,amount_cents,status,related_purchase_id").eq("id", payoutId).maybeSingle();
    if (!payoutBefore) redirect("/admin/payouts?error=Payout%20not%20found");
    if (payoutBefore.status !== "pending") redirect("/admin/payouts?error=This%20payout%20is%20no%20longer%20pending");
    if (Number(payoutBefore.amount_cents) <= 0) redirect("/admin/payouts?error=Invalid%20payout%20amount");
    if (payoutBefore.related_purchase_id) {
      const { data: sale } = await supabase.from("purchases").select("status,seller_earning_cents,amount_cents,commission_cents,file_id,files(seller_id)").eq("id", payoutBefore.related_purchase_id).maybeSingle();
      if (!sale || sale.status !== "completed") redirect("/admin/payouts?error=Linked%20sale%20is%20not%20completed");
      const sellerId = Array.isArray(sale.files) ? sale.files[0]?.seller_id : (sale.files as { seller_id?: string } | null)?.seller_id;
      if (sellerId && sellerId !== payoutBefore.seller_id) redirect("/admin/payouts?error=Payout%20seller%20does%20not%20match%20the%20sale");
      const earning = Number(sale.seller_earning_cents ?? Math.max(0, Number(sale.amount_cents ?? 0) - Number(sale.commission_cents ?? 0)));
      if (Number(payoutBefore.amount_cents) > earning) redirect("/admin/payouts?error=Payout%20amount%20exceeds%20linked%20seller%20earning");
    }
    const { error } = await supabase.rpc("complete_seller_payout", { p_payout_id: payoutId });
    if (error) redirect(`/admin/payouts?error=${encodeURIComponent(error.message)}`);
    await supabase.from("audit_logs").insert({ actor_id: adminId, action: "payout.complete", target_table: "payouts", target_id: payoutId });
    if (payoutBefore.seller_id) {
      await supabase.from("notifications").update({ is_read: true }).eq("profile_id", payoutBefore.seller_id).eq("type", "payout_pending");
      await createAdminClient().from("notifications").insert({ profile_id: payoutBefore.seller_id, type: "payout_completed", title: "Payout completed", body: "Your payout has been marked as paid by StudyHub admin.", link: "/dashboard/payment-settings" });
    }
    revalidatePath("/admin/payouts");
    revalidatePath("/admin");
    revalidatePath("/dashboard/payment-settings");
    revalidatePath("/dashboard");
    redirect("/admin/payouts?saved=Payout%20paid");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/admin/payouts?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not complete payout")}`);
  }
}

export async function rejectPayout(formData: FormData) {
  const { supabase, adminId } = await requireAdmin();
  const payoutId = String(formData.get("payout_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const { data: payoutBefore } = await supabase.from("payouts").select("seller_id").eq("id", payoutId).maybeSingle();
  const rpc = supabase.rpc as unknown as (name: "reject_seller_payout", args: { p_payout_id: string; p_reason: string }) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("reject_seller_payout", { p_payout_id: payoutId, p_reason: reason });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "payout.reject", target_table: "payouts", target_id: payoutId, metadata: { reason } });
  if (payoutBefore?.seller_id) {
    await supabase.from("notifications").update({ is_read: true }).eq("profile_id", payoutBefore.seller_id).eq("type", "payout_pending");
    await createAdminClient().from("notifications").insert({ profile_id: payoutBefore.seller_id, type: "report_update", title: "Payout rejected", body: reason || "Your payout request was rejected by admin.", link: "/dashboard/payment-settings" });
  }
  revalidatePath("/admin/payouts");
  revalidatePath("/admin");
  revalidatePath("/dashboard/payment-settings");
  redirect("/admin/payouts?saved=Payout%20rejected");
}

export async function reconcileSellerFinances() {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("reconcile_seller_financials");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/payment-settings");
  revalidatePath("/dashboard");
  redirect("/admin/payouts?saved=Historical%20seller%20finances%20reconciled");
}
