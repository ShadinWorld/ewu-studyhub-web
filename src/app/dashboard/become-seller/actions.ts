"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { universityEmailSchema, EWU_STUDENT_EMAIL_REGEX } from "@/lib/validations";

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

  const parsed = universityEmailSchema.safeParse({ universityEmail: formData.get("universityEmail") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid EWU email format." };

  const match = parsed.data.universityEmail.match(EWU_STUDENT_EMAIL_REGEX);
  const studentId = match?.[1] ?? null;

  // Reject if this exact student ID / EWU email is already claimed by someone else
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("university_email", parsed.data.universityEmail)
    .neq("id", user.id)
    .maybeSingle();
  if (existing) return { error: "This EWU student ID is already registered to another account." };

  const { error } = await supabase
    .from("profiles")
    .update({
      university_email: parsed.data.universityEmail,
      student_id: studentId,
      student_id_verification_status: "pending",
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/become-seller");
  return {
    success:
      "Request submitted! An admin will verify your EWU student ID shortly — you'll be able to upload once approved.",
  };
}
