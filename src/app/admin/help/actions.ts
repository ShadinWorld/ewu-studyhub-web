"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { GuideAccessRequirement, GuideOverviewKind, GuideSectionGroup, HelpRoleScope, ManagedContentStatus } from "@/types/database.types";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, admin: createAdminClient(), userId: user.id };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function safeHref(formData: FormData, key: string) {
  const value = optional(formData, key);
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f]/.test(value)) {
    throw new Error("Action links must use a safe internal path such as /search or /dashboard.");
  }
  return value;
}

function redirectSaved(kind: string) {
  revalidatePath("/admin/help");
  revalidatePath("/account");
  redirect(`/admin/help?saved=${encodeURIComponent(kind)}`);
}

export async function upsertHelpItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = optional(formData, "id");
  const payload = {
    slug: text(formData, "slug").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""),
    role_scope: (text(formData, "role_scope") || "general") as HelpRoleScope,
    title: text(formData, "title"),
    intro: text(formData, "intro"),
    how_to: optional(formData, "how_to"),
    benefits: optional(formData, "benefits"),
    notes: optional(formData, "notes"),
    status: (text(formData, "status") || "draft") as ManagedContentStatus,
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  if (!payload.slug || !payload.title || !payload.intro) throw new Error("Slug, title and intro are required.");
  const query = id ? admin.from("help_items").update(payload).eq("id", id) : admin.from("help_items").insert(payload);
  const { data, error } = await query.select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: id ? "help_item.update" : "help_item.create", target_table: "help_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved(id ? "Help updated" : "Help created");
}

export async function archiveHelpItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = text(formData, "id");
  const { data, error } = await admin.from("help_items").update({ status: "archived" }).eq("id", id).select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: "help_item.archive", target_table: "help_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved("Help archived");
}

export async function restoreHelpItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = text(formData, "id");
  const { data, error } = await admin.from("help_items").update({ status: "draft" }).eq("id", id).select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: "help_item.restore", target_table: "help_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved("Help restored to draft");
}

export async function upsertGuideSection(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = optional(formData, "id");
  const payload = {
    slug: text(formData, "slug").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""),
    section_group: (text(formData, "section_group") || "general") as GuideSectionGroup,
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    what_is: text(formData, "what_is"),
    how_to: optional(formData, "how_to"),
    benefits: optional(formData, "benefits"),
    notes: optional(formData, "notes"),
    action_label: optional(formData, "action_label"),
    action_href: safeHref(formData, "action_href"),
    required_access: (text(formData, "required_access") || "none") as GuideAccessRequirement,
    locked_message: optional(formData, "locked_message"),
    locked_action_label: optional(formData, "locked_action_label"),
    locked_action_href: safeHref(formData, "locked_action_href"),
    status: (text(formData, "status") || "draft") as ManagedContentStatus,
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  if (!payload.slug || !payload.title || !payload.summary || !payload.what_is) throw new Error("Slug, title, summary and what-is are required.");
  const query = id ? admin.from("guide_sections").update(payload).eq("id", id) : admin.from("guide_sections").insert(payload);
  const { data, error } = await query.select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: id ? "guide_section.update" : "guide_section.create", target_table: "guide_sections", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved(id ? "Guide updated" : "Guide created");
}

export async function archiveGuideSection(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = text(formData, "id");
  const { data, error } = await admin.from("guide_sections").update({ status: "archived" }).eq("id", id).select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: "guide_section.archive", target_table: "guide_sections", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved("Guide section archived");
}


export async function upsertGuideOverviewItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = optional(formData, "id");
  const payload = {
    slug: text(formData, "slug").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""),
    role_scope: (text(formData, "role_scope") || "general") as HelpRoleScope,
    kind: (text(formData, "kind") || "capability") as GuideOverviewKind,
    title: text(formData, "title"),
    summary: text(formData, "summary"),
    benefit: optional(formData, "benefit"),
    action_label: optional(formData, "action_label"),
    action_href: safeHref(formData, "action_href"),
    required_access: (text(formData, "required_access") || "none") as GuideAccessRequirement,
    locked_message: optional(formData, "locked_message"),
    locked_action_label: optional(formData, "locked_action_label"),
    locked_action_href: safeHref(formData, "locked_action_href"),
    status: (text(formData, "status") || "draft") as ManagedContentStatus,
    sort_order: Number(formData.get("sort_order") ?? 0),
  };
  if (!payload.slug || !payload.title || !payload.summary) throw new Error("Slug, title and summary are required.");
  const query = id ? admin.from("guide_overview_items").update(payload).eq("id", id) : admin.from("guide_overview_items").insert(payload);
  const { data, error } = await query.select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: id ? "guide_overview.update" : "guide_overview.create", target_table: "guide_overview_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved(id ? "Overview updated" : "Overview created");
}

export async function archiveGuideOverviewItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = text(formData, "id");
  const { data, error } = await admin.from("guide_overview_items").update({ status: "archived" }).eq("id", id).select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: "guide_overview.archive", target_table: "guide_overview_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved("Overview item archived");
}

export async function restoreGuideOverviewItem(formData: FormData) {
  const { admin, userId } = await requireAdmin();
  const id = text(formData, "id");
  const { data, error } = await admin.from("guide_overview_items").update({ status: "draft" }).eq("id", id).select("id, slug").single();
  if (error) throw new Error(error.message);
  await admin.from("audit_logs").insert({ actor_id: userId, action: "guide_overview.restore", target_table: "guide_overview_items", target_id: data.id, metadata: { slug: data.slug } });
  redirectSaved("Overview item restored to draft");
}
