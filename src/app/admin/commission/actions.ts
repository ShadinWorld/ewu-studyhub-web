"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated"); const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single(); if (!profile || !["admin","super_admin"].includes(profile.role)) throw new Error("Not authorized"); return { supabase, userId: user.id }; }

export async function updateDefaultPlatformFee(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const amount = Number(formData.get("fee_bdt"));
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000) throw new Error("Platform fee must be between 0 and 1000 BDT.");
  const { error } = await supabase.rpc("set_default_platform_fee", { p_fee_cents: Math.round(amount * 100) });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: userId, action: "pricing.default_fee_update", target_table: "platform_pricing_settings", metadata: { fee_bdt: amount } });
  revalidatePath("/admin/commission"); revalidatePath("/");
  redirect("/admin/commission?saved=Platform%20fee%20updated");
}

export async function updateResourcePlatformFee(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const fileId = String(formData.get("file_id") ?? "").trim();
  const amount = Number(formData.get("fee_bdt"));
  if (!fileId || !Number.isFinite(amount) || amount < 0 || amount > 1000) throw new Error("Enter a valid platform fee between 0 and 1000 BDT.");
  const { error } = await supabase.rpc("set_resource_platform_fee", { p_file_id: fileId, p_fee_cents: Math.round(amount * 100) });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ actor_id: userId, action: "pricing.resource_fee_update", target_table: "files", target_id: fileId, metadata: { fee_bdt: amount } });
  revalidatePath("/admin/commission"); revalidatePath(`/files/${fileId}`); revalidatePath("/");
  redirect("/admin/commission?saved=Resource%20fee%20updated");
}
