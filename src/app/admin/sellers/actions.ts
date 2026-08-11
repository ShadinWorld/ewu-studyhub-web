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

  const { error } = await admin
    .from("profiles")
    .update({
      is_seller: true,
      university_email_verified: true,
      student_id_verification_status: "verified",
    })
    .eq("id", targetUserId);
  if (error) return { error: error.message };

  await admin.from("notifications").insert({
    profile_id: targetUserId,
    type: "upload_approved",
    title: "You're now a verified seller!",
    body: "Your EWU student ID has been verified. You can start uploading resources.",
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

  await admin.from("audit_logs").insert({
    actor_id: adminId,
    action: "seller.reject",
    target_table: "profiles",
    target_id: targetUserId,
  });

  revalidatePath("/admin/sellers");
  return { success: true };
}
