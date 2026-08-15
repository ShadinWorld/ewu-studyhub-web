"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return supabase;
}

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createFaq(formData: FormData) {
  const supabase = await requireAdmin();
  const question = clean(formData.get("question"));
  const answer = clean(formData.get("answer"));
  const category = clean(formData.get("category")) || "General";
  const sortOrder = Number(formData.get("sort_order") || 0);
  const isPublished = formData.get("is_published") === "on";
  if (question.length < 5 || answer.length < 5) throw new Error("Question and answer must be at least 5 characters.");
  const { error } = await supabase.from("faqs").insert({ category, question, answer, sort_order: Number.isFinite(sortOrder) ? sortOrder : 0, is_published: isPublished });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/faqs");
}

export async function updateFaq(formData: FormData) {
  const supabase = await requireAdmin();
  const id = clean(formData.get("id"));
  const question = clean(formData.get("question"));
  const answer = clean(formData.get("answer"));
  const category = clean(formData.get("category")) || "General";
  const sortOrder = Number(formData.get("sort_order") || 0);
  const isPublished = formData.get("is_published") === "on";
  if (!id || question.length < 5 || answer.length < 5) throw new Error("Invalid FAQ data.");
  const { error } = await supabase.from("faqs").update({ category, question, answer, sort_order: Number.isFinite(sortOrder) ? sortOrder : 0, is_published: isPublished }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/faqs");
}

export async function deleteFaq(formData: FormData) {
  const supabase = await requireAdmin();
  const id = clean(formData.get("id"));
  if (!id) throw new Error("Missing FAQ id.");
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin/faqs");
}
