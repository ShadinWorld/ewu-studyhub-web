"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    throw new Error("Not authorized");
  }
  return { supabase, adminId: user.id };
}

export async function approveFile(fileId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("files")
    .update({ visibility: "published", published_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", fileId);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    actor_id: adminId,
    action: "file.approve",
    target_table: "files",
    target_id: fileId,
  });

  // Notify the seller
  const { data: file } = await supabase.from("files").select("seller_id, title").eq("id", fileId).single();
  if (file) {
    await createAdminClient().from("notifications").update({ is_read: true }).eq("profile_id", file.seller_id).eq("type", "upload_pending");
    await createAdminClient().from("notifications").insert({
      profile_id: file.seller_id,
      type: "upload_approved",
      title: "Your upload was approved",
      body: `"${file.title}" is now live on EWU StudyHub.`,
      link: `/files/${fileId}`,
    });
  }

  revalidatePath("/admin/uploads");
  return { success: true };
}

export async function rejectFile(fileId: string, reason: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("files")
    .update({ visibility: "rejected", rejection_reason: reason || "Did not meet content guidelines." })
    .eq("id", fileId);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    actor_id: adminId,
    action: "file.reject",
    target_table: "files",
    target_id: fileId,
    metadata: { reason },
  });

  const { data: file } = await supabase.from("files").select("seller_id, title").eq("id", fileId).single();
  if (file) await createAdminClient().from("notifications").update({ is_read: true }).eq("profile_id", file.seller_id).eq("type", "upload_pending");
  if (file) {
    await createAdminClient().from("notifications").insert({
      profile_id: file.seller_id,
      type: "upload_rejected",
      title: "Your upload was rejected",
      body: reason || `"${file.title}" did not meet our content guidelines.`,
      link: `/dashboard`,
    });
  }

  revalidatePath("/admin/uploads");
  return { success: true };
}
