"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("notification_id") ?? "").trim();
  if (!id) throw new Error("Notification not found");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  revalidatePath("/notifications");
}

export async function markNotificationReadById(notificationId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId).eq("profile_id", user.id);
  if (error) throw new Error(error.message);
  await supabase.rpc("record_user_activity", { p_actor_id: user.id, p_action: "notification.open", p_entity_type: "notification", p_entity_id: notificationId, p_description: "Opened notification", p_metadata: {} });
  revalidatePath("/notifications");
  return { ok: true };
}
