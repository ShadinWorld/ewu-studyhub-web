"use server";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMarketplaceSettings(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const number = String(formData.get("bkash_number") ?? "").trim();
  const commissionType = String(formData.get("commission_type") ?? "percentage");
  const percent = Number(formData.get("default_commission_percent") ?? 0);
  const fixedTaka = Number(formData.get("default_commission_amount") ?? 0);

  if (!/^01\d{9}$/.test(number)) throw new Error("Enter a valid 11-digit bKash number.");
  if (!["percentage", "fixed_amount"].includes(commissionType)) throw new Error("Invalid commission type.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Commission percentage must be between 0 and 100.");
  if (!Number.isFinite(fixedTaka) || fixedTaka < 0) throw new Error("Fixed commission cannot be negative.");

  const { error } = await supabase.rpc("update_platform_payment_settings", {
    p_bkash_number: number,
    p_commission_type: commissionType as "percentage" | "fixed_amount",
    p_default_commission_percent: percent,
    p_default_commission_amount_cents: Math.round(fixedTaka * 100),
  });
  if (error) throw new Error(error.message);

  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "settings.payment_update",
    target_table: "platform_payment_settings",
    metadata: {
      payment_method: "bkash",
      commission_type: commissionType,
      commission_percent: percent,
      fixed_amount_taka: fixedTaka,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  revalidatePath("/admin/payouts");
  redirect("/admin/settings?saved=Marketplace%20settings%20saved");
}

export async function saveHomepageAdminControls(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  const admin = supabase as any;
  const titles = Array.from({ length: 9 }, (_, i) => String(formData.get(`title_${i + 1}`) ?? "").trim());
  const hrefs = Array.from({ length: 9 }, (_, i) => String(formData.get(`href_${i + 1}`) ?? "").trim());
  const enabled = Array.from({ length: 9 }, (_, i) => formData.get(`enabled_${i + 1}`) === "on");
  const icons = Array.from({ length: 9 }, (_, i) => String(formData.get(`icon_${i + 1}`) ?? "LayoutDashboard").trim());
  const { data: current } = await admin.from("homepage_quick_actions").select("id,display_order").eq("audience", "admin").order("display_order", { ascending: true }).limit(9);
  for (let i = 0; i < 9; i++) {
    const row = current?.[i];
    if (!row) continue;
    await admin.from("homepage_quick_actions").update({ title: titles[i] || `Action ${i + 1}`, href: hrefs[i] || "/admin", icon: icons[i] || "LayoutDashboard", is_enabled: enabled[i], display_order: i + 1, updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=Homepage%20quick%20actions%20saved");
}

export async function saveResponseTimeSettings(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  const admin = supabase as any;
  const categories = ["default", "seller_verification", "resource_approval", "payout_request", "purchase_request", "report", "support", "payment"];
  for (const category of categories) {
    const hours = Math.max(1, Math.min(168, Number(formData.get(`hours_${category}`) ?? 6)));
    await admin.from("platform_response_time_settings").upsert({ category, estimated_hours: Number.isFinite(hours) ? hours : 6, updated_at: new Date().toISOString() });
  }
  revalidatePath("/admin/settings");
  revalidatePath("/requests");
  redirect("/admin/settings?saved=Response%20time%20settings%20saved");
}
export async function saveQuickAttentionControls(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) throw new Error("Not authorized");
  const admin = supabase as any;
  const titles = Array.from({ length: 8 }, (_, i) => String(formData.get(`attention_title_${i + 1}`) ?? "").trim());
  const hrefs = Array.from({ length: 8 }, (_, i) => String(formData.get(`attention_href_${i + 1}`) ?? "/admin/pending").trim());
  const icons = Array.from({ length: 8 }, (_, i) => String(formData.get(`attention_icon_${i + 1}`) ?? "BellRing").trim());
  const enabled = Array.from({ length: 8 }, (_, i) => formData.get(`attention_enabled_${i + 1}`) === "on");
  const { data: current } = await admin.from("homepage_quick_attention").select("id").eq("audience", "admin").order("display_order", { ascending: true }).limit(8);
  for (let i = 0; i < 8; i++) {
    const row = current?.[i];
    if (!row) continue;
    await admin.from("homepage_quick_attention").update({ title: titles[i] || `Attention ${i + 1}`, href: hrefs[i] || "/admin/pending", icon: icons[i] || "BellRing", is_enabled: enabled[i], display_order: i + 1, updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=Quick%20attention%20saved");
}
