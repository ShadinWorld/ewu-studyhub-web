"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBkashNumber(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const number = String(formData.get("bkash_number") ?? "").trim();

  if (!/^01\d{9}$/.test(number)) {
    throw new Error("Enter a valid 11-digit bKash number.");
  }

  const { data: profile } = await supabase.from("profiles").select("id, role, is_seller").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "seller") {
    redirect("/dashboard/payment-settings?error=Seller%20account%20not%20found");
  }

  const admin = (await import("@/lib/supabase/server")).createAdminClient();
  const { error } = await admin.from("seller_payment_settings").upsert({
    seller_id: user.id,
    bkash_number: number,
    updated_at: new Date().toISOString(),
  }, { onConflict: "seller_id" });

  if (error) {
    redirect(`/dashboard/payment-settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment-settings");
  redirect("/dashboard/payment-settings?saved=bKash%20number%20saved");
}

export async function requestPayout() { throw new Error("Manual payout requests are disabled. Payouts are created automatically after approved sales."); }
