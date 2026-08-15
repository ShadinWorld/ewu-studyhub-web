"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database.types";

const VALID_ROLES = ["guest", "student", "verified_student", "seller", "admin", "super_admin"] as const;
const isUserRole = (value: string): value is UserRole =>
  (VALID_ROLES as readonly string[]).includes(value);

export async function updateUserRole(targetUserId: string, newRole: string) {
  if (!isUserRole(newRole)) return { error: "Invalid role" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: callerProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // Only super_admin can grant admin/super_admin roles — prevents privilege escalation
  // by a regular admin promoting themselves or others.
  if (["admin", "super_admin"].includes(newRole) && callerProfile?.role !== "super_admin") {
    return { error: "Only a super admin can assign that role." };
  }
  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return { error: "Not authorized" };
  }
  if (targetUserId === user.id && callerProfile.role === "super_admin" && newRole !== "super_admin") {
    return { error: "A super admin cannot remove their own super admin access from this screen." };
  }

  // Use the admin (service-role) client for the actual write: RLS intentionally
  // only lets a profile update itself, so cross-user role changes must go
  // through this explicitly-checked server action, never the client directly.
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: newRole }).eq("id", targetUserId);
  if (error) return { error: error.message };

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "user.role_change",
    target_table: "profiles",
    target_id: targetUserId,
    metadata: { new_role: newRole },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
