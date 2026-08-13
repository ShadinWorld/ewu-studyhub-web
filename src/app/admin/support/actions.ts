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

export async function updateSupportTicket(formData: FormData) {
  const { supabase, adminId } = await requireAdmin();
  const id = String(formData.get("ticket_id") ?? "").trim();
  const status = String(formData.get("status") ?? "in_review").trim();
  const reply = String(formData.get("admin_reply") ?? "").trim();
  if (!id) throw new Error("Support request not found");
  if (!["new", "in_review", "resolved"].includes(status)) throw new Error("Invalid status");

  const payload: Record<string, unknown> = { status };
  if (reply) {
    payload.admin_reply = reply;
    payload.replied_by = adminId;
    payload.replied_at = new Date().toISOString();
  }

  const { error } = await supabase.from("support_tickets").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/support");
  revalidatePath("/support");
}
