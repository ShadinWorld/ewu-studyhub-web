"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { admin: createAdminClient(), adminId: user.id };
}

export async function removeResource(formData: FormData) {
  const { admin, adminId } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Resource ID is required.");

  const { data: file, error } = await admin
    .from("files")
    .select("id,title,storage_path,preview_storage_path,seller_id")
    .eq("id", id)
    .single();

  if (error || !file) throw new Error("Resource not found.");

  const paths = [file.storage_path, file.preview_storage_path].filter(Boolean) as string[];
  if (paths.length) {
    await admin.storage.from("files-private").remove([file.storage_path]);
    const previewPath = file.preview_storage_path;
    if (previewPath) await admin.storage.from("files-preview").remove([previewPath]);
  }

  const { error: deleteError } = await admin.from("files").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  await admin.from("audit_logs").insert({
    actor_id: adminId,
    action: "resource.remove",
    target_table: "files",
    target_id: id,
    metadata: { title: file.title },
  });

  revalidatePath("/admin/resources");
  revalidatePath("/");
  return { ok: true, title: file.title };
}
