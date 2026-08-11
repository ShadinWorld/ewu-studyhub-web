"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, adminId: user.id };
}

export async function resolveReport(reportId: string, removeFile: boolean) {
  const { supabase, adminId } = await requireAdmin();

  const { data: report } = await supabase.from("reports").select("file_id").eq("id", reportId).single();

  const { error } = await supabase
    .from("reports")
    .update({ status: "resolved", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) return { error: error.message };

  if (removeFile && report?.file_id) {
    await supabase.from("files").update({ visibility: "rejected", rejection_reason: "Removed after a content report." }).eq("id", report.file_id);
  }

  await supabase.from("audit_logs").insert({
    actor_id: adminId,
    action: removeFile ? "report.resolve_and_remove_file" : "report.resolve",
    target_table: "reports",
    target_id: reportId,
  });

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function dismissReport(reportId: string) {
  const { supabase, adminId } = await requireAdmin();

  const { error } = await supabase
    .from("reports")
    .update({ status: "dismissed", resolved_by: adminId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) return { error: error.message };

  revalidatePath("/admin/reports");
  return { success: true };
}
