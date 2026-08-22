"use server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated"); const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single(); if (!profile || !["admin","super_admin"].includes(profile.role)) throw new Error("Not authorized"); return { admin: createAdminClient(), adminId: user.id }; }

export async function removeResource(formData: FormData) {
  const { admin, adminId } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Resource ID is required.");
  const { data: file, error } = await admin.from("files").select("id,title,visibility,seller_id").eq("id", id).single();
  if (error || !file) throw new Error("Resource not found.");
  const { error: updateError } = await admin.from("files").update({ visibility: "archived", rejection_reason: "Removed from public marketplace by admin." }).eq("id", id);
  if (updateError) throw new Error(updateError.message);
  await admin.from("audit_logs").insert({ actor_id: adminId, action: "resource.soft_remove", target_table: "files", target_id: id, metadata: { title: file.title, previous_visibility: file.visibility } });
  await admin.rpc("record_user_activity", { p_actor_id: adminId, p_action: "resource.soft_remove", p_entity_type: "resource", p_entity_id: id, p_description: `Removed ${file.title} from the public marketplace`, p_metadata: { buyer_access_preserved: true } });
  revalidatePath("/admin/resources"); revalidatePath("/admin"); revalidatePath("/"); return { ok: true, title: file.title };
}
