"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { user, adminId: user.id };
}

export async function approveSeller(targetUserId: string) {
  const { adminId } = await requireAdmin();
  const admin = createAdminClient();

  const { data: targetProfile, error: profileError } = await admin
    .from("profiles")
    .select("seller_bkash_number")
    .eq("id", targetUserId)
    .single();
  if (profileError) return { error: profileError.message };

  const { error } = await admin
    .from("profiles")
    .update({
      is_seller: true,
      role: "seller",
      university_email_verified: true,
      student_id_verification_status: "verified",
    })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  if (targetProfile?.seller_bkash_number) {
    const { error: paymentError } = await admin
      .from("seller_payment_settings")
      .upsert({
        seller_id: targetUserId,
        bkash_number: targetProfile.seller_bkash_number,
        updated_at: new Date().toISOString(),
      });
    if (paymentError) return { error: paymentError.message };
  }

  await admin.from("notifications").insert({
    profile_id: targetUserId,
    type: "report_update",
    title: "You're now a verified seller!",
    body: targetProfile?.seller_bkash_number
      ? "Your EWU student ID was approved and your bKash payout number was saved. You can start uploading resources."
      : "Your EWU student ID was approved. Add your bKash payout number before requesting earnings.",
    link: "/dashboard/upload",
  });

  await admin.from("audit_logs").insert({
    actor_id: adminId,
    action: "seller.approve",
    target_table: "profiles",
    target_id: targetUserId,
  });

  revalidatePath("/admin/sellers");
  return { success: true };
}

export async function rejectSeller(targetUserId: string) {
  const { adminId } = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ student_id_verification_status: "rejected" })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  await admin.from("notifications").insert({
    profile_id: targetUserId,
    type: "report_update",
    title: "Seller verification rejected",
    body: "Your seller verification request was not approved. Please review your details and submit again.",
    link: "/dashboard/become-seller",
  });

  await admin.from("audit_logs").insert({
    actor_id: adminId,
    action: "seller.reject",
    target_table: "profiles",
    target_id: targetUserId,
  });

  revalidatePath("/admin/sellers");
  return { success: true };
}
