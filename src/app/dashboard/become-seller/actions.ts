"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { universityEmailSchema } from "@/lib/validations";

export type SellerFormState = { error?: string; success?: string } | undefined;

export async function requestSellerVerification(
  _prev: SellerFormState,
  formData: FormData
): Promise<SellerFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = universityEmailSchema.safeParse({
    universityEmail: formData.get("universityEmail"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid EWU email format." };
  }

  const bkashNumber = String(formData.get("bkash_number") ?? "").trim();
  if (!/^01\d{9}$/.test(bkashNumber)) {
    return { error: "Enter a valid 11-digit bKash number." };
  }

  const { error } = await supabase.rpc("request_seller_verification", {
    p_university_email: parsed.data.universityEmail,
    p_bkash_number: bkashNumber,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/become-seller");
  revalidatePath("/admin/sellers");
  return {
    success:
      "Request submitted! Your EWU student ID and bKash payout number are saved. An admin will review your seller request shortly.",
  };
}
