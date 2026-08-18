"use server";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateResourceCommission(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const fileId = String(formData.get("file_id") ?? "");
  const raw = String(formData.get("commission_percent") ?? "").trim();
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) throw new Error("Commission must be between 0 and 100.");
  const { error } = await supabase.rpc("set_resource_commission", { p_file_id: fileId, p_commission_percent: value });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/commission");
  revalidatePath(`/files/${fileId}`);
  redirect("/admin/commission?saved=Commission%20updated");
}
