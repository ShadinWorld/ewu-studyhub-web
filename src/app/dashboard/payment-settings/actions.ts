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

  // This RPC already exists in the database, but it is not included
  // in the currently generated Supabase TypeScript definitions.
  const rpc = supabase.rpc as unknown as (
    functionName: "save_seller_bkash_number",
    args: { p_bkash_number: string }
  ) => Promise<{ error: { message: string } | null }>;

  const { error } = await rpc("save_seller_bkash_number", {
    p_bkash_number: number,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment-settings");
}

export async function requestPayout(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const amount = Number(formData.get("amount_bdt"));

  if (!Number.isFinite(amount) || amount < 20) {
    throw new Error("Minimum payout is BDT 20.");
  }

  const { error } = await supabase.rpc("request_seller_payout", {
    p_amount_cents: Math.round(amount * 100),
  });

  if (error) {
    throw new Error(error.message);
  }

  const admin = (await import("@/lib/supabase/server")).createAdminClient();
  await admin.from("notifications").insert({
    profile_id: user.id,
    type: "payout_pending",
    title: "Payout request submitted",
    body: `Your payout request for BDT ${amount.toFixed(2)} is waiting for admin payment.`,
    link: "/notifications",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment-settings");
  revalidatePath("/notifications");
  redirect("/notifications");
}