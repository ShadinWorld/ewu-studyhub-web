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

export async function requestPayout() { throw new Error("Manual payout requests are disabled. Payouts are created automatically after approved sales."); }
