"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, adminId: user.id };
}

async function getBatchFileIds(supabase: ReturnType<typeof createClient>, fileId: string) {
  const { data: seed } = await supabase.from("files").select("id, upload_batch_id").eq("id", fileId).maybeSingle();
  if (!seed) return [] as string[];
  if (!seed.upload_batch_id) return [seed.id];
  const { data: siblings } = await supabase.from("files").select("id").eq("upload_batch_id", seed.upload_batch_id);
  return (siblings ?? []).map((row) => row.id);
}

export async function regroupPendingBatch(fileIds: string[], groups: string[]) {
  const { supabase, adminId } = await requireAdmin();
  if (!Array.isArray(fileIds) || fileIds.length < 2 || fileIds.length > 3) return { error: "Only 2–3 file pending submissions can be regrouped." };
  if (!Array.isArray(groups) || groups.length !== fileIds.length) return { error: "Grouping data is invalid." };
  const uniqueIds = Array.from(new Set(fileIds));
  if (uniqueIds.length !== fileIds.length) return { error: "Duplicate file IDs are not allowed." };
  const { data: rows } = await supabase.from("files").select("id,seller_id,visibility,upload_batch_id,title").in("id", uniqueIds);
  if ((rows ?? []).length !== uniqueIds.length || (rows ?? []).some((row) => row.visibility !== "draft")) return { error: "Only pending resources can be regrouped." };
  const sellerIds = new Set((rows ?? []).map((row) => row.seller_id));
  if (sellerIds.size !== 1) return { error: "All files in the regroup operation must belong to the same seller." };
  const existingPurchases = await supabase.from("purchases").select("id").in("file_id", uniqueIds).limit(1);
  if (existingPurchases.data?.length) return { error: "A purchased resource cannot be regrouped." };

  const grouped = new Map<string, string[]>();
  uniqueIds.forEach((id, index) => { const key = String(groups[index] || "1"); const bucket = grouped.get(key) ?? []; bucket.push(id); grouped.set(key, bucket); });
  const batchAssignments: Array<{ group: string; ids: string[] }> = [];
  for (const ids of grouped.values()) batchAssignments.push({ group: randomUUID(), ids });
  const seedFile = rows?.[0];
  const baseTitle = (seedFile?.title || "Resource").slice(0, 130);
  for (let groupIndex = 0; groupIndex < batchAssignments.length; groupIndex += 1) {
    const { group, ids } = batchAssignments[groupIndex];
    const uploadBatchId = ids.length > 1 ? group : null;
    const label = batchAssignments.length > 1 ? ` — Part ${groupIndex + 1}` : "";
    const title = `${baseTitle}${label}`.slice(0, 150);
    const { error } = await supabase.from("files").update({ upload_batch_id: uploadBatchId, visibility: "draft", title }).in("id", ids);
    if (error) return { error: error.message };
  }
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "file.pending_regroup", target_table: "files", target_id: uniqueIds[0], metadata: { file_ids: uniqueIds, groups: batchAssignments.map((item) => item.ids) } });
  revalidatePath("/admin/uploads"); revalidatePath("/admin/resources");
  return { success: true, groups: batchAssignments.map((item) => item.ids) };
}

export async function approveFile(fileId: string) {
  return approveBatch(fileId);
}

export async function approveBatch(fileId: string) {
  const { supabase, adminId } = await requireAdmin();
  const ids = await getBatchFileIds(supabase, fileId);
  if (!ids.length) return { error: "Upload batch not found." };
  const now = new Date().toISOString();
  const { error } = await supabase.from("files").update({ visibility: "published", published_at: now, rejection_reason: null }).in("id", ids);
  if (error) return { error: error.message };

  const { data: files } = await supabase.from("files").select("id, seller_id, title").in("id", ids).order("created_at", { ascending: true });
  const sellerId = files?.[0]?.seller_id;
  const title = files?.[0]?.title ?? "Resource";
  const count = ids.length;
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "file.batch_approve", target_table: "files", target_id: ids[0], metadata: { file_ids: ids, count } });

  if (sellerId) {
    const admin = createAdminClient();
    await admin.from("notifications").update({ is_read: true }).eq("profile_id", sellerId).eq("type", "upload_pending");
    await admin.from("notifications").insert({
      profile_id: sellerId,
      type: "upload_approved",
      title: count > 1 ? "Your upload batch was approved" : "Your upload was approved",
      body: count > 1 ? `${count} files in “${title}” are now live on EWU StudyHub.` : `“${title}” is now live on EWU StudyHub.`,
      link: `/files/${ids[0]}`,
    });
  }
  revalidatePath("/admin/uploads");
  revalidatePath("/dashboard");
  revalidatePath("/search");
  return { success: true, count };
}

export async function rejectFile(fileId: string, reason: string) {
  return rejectBatch(fileId, reason);
}

export async function rejectBatch(fileId: string, reason: string) {
  const { supabase, adminId } = await requireAdmin();
  const ids = await getBatchFileIds(supabase, fileId);
  if (!ids.length) return { error: "Upload batch not found." };
  const safeReason = reason.trim() || "Did not meet content guidelines.";
  const { error } = await supabase.from("files").update({ visibility: "rejected", rejection_reason: safeReason }).in("id", ids);
  if (error) return { error: error.message };

  const { data: files } = await supabase.from("files").select("id, seller_id, title").in("id", ids).order("created_at", { ascending: true });
  const sellerId = files?.[0]?.seller_id;
  const title = files?.[0]?.title ?? "Resource";
  const count = ids.length;
  await supabase.from("audit_logs").insert({ actor_id: adminId, action: "file.batch_reject", target_table: "files", target_id: ids[0], metadata: { file_ids: ids, count, reason: safeReason } });

  if (sellerId) {
    const admin = createAdminClient();
    await admin.from("notifications").update({ is_read: true }).eq("profile_id", sellerId).eq("type", "upload_pending");
    await admin.from("notifications").insert({
      profile_id: sellerId,
      type: "upload_rejected",
      title: count > 1 ? "Your upload batch was rejected" : "Your upload was rejected",
      body: count > 1 ? `${count} files in “${title}” were rejected. ${safeReason}` : safeReason,
      link: "/dashboard",
    });
  }
  revalidatePath("/admin/uploads");
  revalidatePath("/dashboard");
  return { success: true, count };
}
