"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function deleteStorageObject(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  const bucket = String(formData.get("bucket_id") ?? "");
  const name = String(formData.get("object_name") ?? "");
  const allowed = ["files-private", "files-preview", "thumbnails", "avatars", "student-id-docs"];
  if (!allowed.includes(bucket) || !name) throw new Error("Invalid storage object.");
  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).remove([name]);
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: user.id, action: "storage.object_delete", target_table: "storage.objects", metadata: { bucket_id: bucket, object_name: name } });
  revalidatePath("/admin/storage");
}
