"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return user;
}

export async function addPrerequisite(formData: FormData) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const prerequisiteCourseId = String(formData.get("prerequisite_course_id") ?? "").trim();
  if (!courseId || !prerequisiteCourseId || courseId === prerequisiteCourseId) {
    throw new Error("Choose two different courses.");
  }

  const { error } = await admin.from("course_prerequisites").upsert(
    { course_id: courseId, prerequisite_course_id: prerequisiteCourseId },
    { onConflict: "course_id,prerequisite_course_id" },
  );
  if (error) throw new Error(error.message);

  await admin.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: "academic_tool.prerequisite_add",
    p_entity_type: "course_prerequisite",
    p_entity_id: courseId,
    p_description: `Added prerequisite mapping from ${prerequisiteCourseId} to ${courseId}`,
    p_metadata: { course_id: courseId, prerequisite_course_id: prerequisiteCourseId },
  });

  revalidatePath("/admin/academic-tools/prerequisites");
  revalidatePath("/tools/prerequisite-checker");
  redirect("/admin/academic-tools/prerequisites?saved=Prerequisite%20saved");
}

export async function deletePrerequisite(formData: FormData) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const prerequisiteCourseId = String(formData.get("prerequisite_course_id") ?? "").trim();
  if (!courseId || !prerequisiteCourseId) throw new Error("Prerequisite mapping is incomplete.");

  const { error } = await admin
    .from("course_prerequisites")
    .delete()
    .eq("course_id", courseId)
    .eq("prerequisite_course_id", prerequisiteCourseId);
  if (error) throw new Error(error.message);

  await admin.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: "academic_tool.prerequisite_delete",
    p_entity_type: "course_prerequisite",
    p_entity_id: courseId,
    p_description: `Removed prerequisite mapping from ${prerequisiteCourseId} to ${courseId}`,
    p_metadata: { course_id: courseId, prerequisite_course_id: prerequisiteCourseId },
  });

  revalidatePath("/admin/academic-tools/prerequisites");
  revalidatePath("/tools/prerequisite-checker");
  redirect("/admin/academic-tools/prerequisites?saved=Prerequisite%20removed");
}
