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

const ALLOWED_ICONS = new Set([
  "CalendarDays", "ClipboardCheck", "FileClock", "FileQuestion", "GraduationCap",
  "Calculator", "ListChecks", "BookOpen", "BookOpenCheck", "Clock3", "SearchCheck",
  "ExternalLink", "Lightbulb", "Wrench", "BarChart3",
]);

function safeIcon(value: string) {
  return ALLOWED_ICONS.has(value) ? value : "GraduationCap";
}

function safeHref(value: string) {
  const href = value.trim();
  if (!href.startsWith("/") && !href.startsWith("https://")) {
    throw new Error("Tool link must start with / or https://");
  }
  if (href.length > 500) throw new Error("Tool link is too long.");
  return href;
}

export async function createStudentTool(formData: FormData) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const href = safeHref(String(formData.get("href") ?? ""));
  const icon = safeIcon(String(formData.get("icon") ?? "GraduationCap"));
  const openInNewTab = String(formData.get("open_in_new_tab") ?? "") === "true";

  if (title.length < 2 || title.length > 120) throw new Error("Title must be 2–120 characters.");
  if (description.length > 500) throw new Error("Description is too long.");

  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "student-tool";
  const { data: existingSlugs, error: slugError } = await admin
    .from("student_tool_catalog")
    .select("slug");
  if (slugError) throw new Error(slugError.message);
  const existingSlugSet = new Set((existingSlugs ?? []).map(row => row.slug));
  let slug = slugBase;
  let i = 2;
  while (existingSlugSet.has(slug)) slug = `${slugBase}-${i++}`;

  const { data: maxRow, error: maxError } = await admin
    .from("student_tool_catalog")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw new Error(maxError.message);
  const displayOrder = Number(maxRow?.display_order ?? 0) + 10;

  const { data, error } = await admin.from("student_tool_catalog").insert({
    slug,
    title,
    description,
    href,
    icon,
    is_active: true,
    is_builtin: false,
    display_order: displayOrder,
    open_in_new_tab: openInNewTab,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);

  await admin.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: "student_tool.create",
    p_entity_type: "student_tool",
    p_entity_id: data.id,
    p_description: `Added Student Academic Tool: ${title}`,
    p_metadata: { href, icon, open_in_new_tab: openInNewTab },
  });

  revalidatePath("/tools");
  revalidatePath("/");
  revalidatePath("/admin/academic-tools/student-tools");
  redirect("/admin/academic-tools/student-tools?saved=Student%20tool%20added");
}

export async function toggleStudentTool(formData: FormData) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  const { data: current, error: readError } = await admin
    .from("student_tool_catalog")
    .select("id,title,is_active")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) throw new Error(readError?.message ?? "Tool not found.");

  const nextActive = !current.is_active;
  const { error } = await admin.from("student_tool_catalog").update({ is_active: nextActive }).eq("id", id);
  if (error) throw new Error(error.message);

  await admin.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: `student_tool.${nextActive ? "enable" : "disable"}`,
    p_entity_type: "student_tool",
    p_entity_id: id,
    p_description: `${nextActive ? "Enabled" : "Removed"} Student Academic Tool: ${current.title}`,
  });

  revalidatePath("/tools");
  revalidatePath("/");
  revalidatePath("/admin/academic-tools/student-tools");
  redirect(`/admin/academic-tools/student-tools?saved=${encodeURIComponent(nextActive ? "Student tool enabled" : "Student tool removed")}`);
}

export async function deleteStudentTool(formData: FormData) {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  const { data: current, error: readError } = await admin
    .from("student_tool_catalog")
    .select("id,title,is_builtin")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current) throw new Error(readError?.message ?? "Tool not found.");
  if (current.is_builtin) throw new Error("Built-in tools can be removed from students but are not permanently deleted.");

  const { error } = await admin.from("student_tool_catalog").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await admin.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: "student_tool.delete",
    p_entity_type: "student_tool",
    p_entity_id: id,
    p_description: `Deleted custom Student Academic Tool: ${current.title}`,
  });

  revalidatePath("/tools");
  revalidatePath("/");
  revalidatePath("/admin/academic-tools/student-tools");
  redirect("/admin/academic-tools/student-tools?saved=Student%20tool%20deleted");
}
