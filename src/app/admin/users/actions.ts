"use server";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  return { supabase, admin: createAdminClient(), adminId: user.id, role: profile.role };
}


const USER_ROLES: readonly UserRole[] = [
  "student",
  "verified_student",
  "seller",
  "admin",
  "super_admin",
];

export async function updateUserRole(userId: string, role: string) {
  try {
    const { admin, adminId } = await requireAdmin();
    if (!userId) return { error: "User ID is required" };
    if (!USER_ROLES.includes(role as UserRole)) return { error: "Invalid user role" };

    const nextRole = role as UserRole;
    const { error } = await admin
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", userId);

    if (error) return { error: error.message };

    await admin.from("audit_logs").insert({
      actor_id: adminId,
      action: `user.role.${nextRole}`,
      target_table: "profiles",
      target_id: userId,
      metadata: { role: nextRole },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { ok: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update role" };
  }
}

export async function updateUserStatus(formData: FormData) {
  const { admin, adminId } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "active");
  const allowedStatuses = ["active", "restricted", "suspended", "banned"] as const;
  if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) throw new Error("Invalid account status");
  const accountStatus = status as (typeof allowedStatuses)[number];
  await admin.from("profiles").update({ account_status: accountStatus }).eq("id", userId);
  await admin.from("audit_logs").insert({ actor_id: adminId, action: `user.status.${accountStatus}`, target_table: "profiles", target_id: userId });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect("/admin/users?saved=User%20status%20updated");
}

export async function sendAdminMessage(formData: FormData) {
  const { admin, adminId } = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!userId || subject.length < 2 || body.length < 3) throw new Error("Subject and message are required.");
  const { error } = await admin.from("admin_messages").insert({ user_id: userId, admin_id: adminId, subject, body });
  if (error) throw new Error(error.message);
  await admin.from("notifications").insert({ profile_id: userId, type: "report_update", title: subject, body, link: "/notifications" });
  await admin.from("audit_logs").insert({ actor_id: adminId, action: "user.message", target_table: "profiles", target_id: userId, metadata: { subject } });
  revalidatePath(`/admin/users/${userId}`);
  redirect(`/admin/users/${userId}?saved=Message%20sent`);
}
