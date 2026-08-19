"use server";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { universityEmailSchema } from "@/lib/validations";
export type SellerFormState = { error?: string; success?: string } | undefined;
export async function requestSellerVerification(_prev: SellerFormState, formData: FormData): Promise<SellerFormState> {
  const supabase = createClient(); const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: "Not authenticated." };
  const parsed = universityEmailSchema.safeParse({ universityEmail: formData.get("universityEmail") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid EWU email format." };
  const file = formData.get("studentIdDocument");
  if (!(file instanceof File) || file.size === 0) return { error: "Upload a clear photo of your EWU student ID card." };
  if (file.size > 5 * 1024 * 1024) return { error: "ID card image must be 5 MB or smaller." };
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed for the student ID card." };
  const bkashNumber = String(formData.get("bkash_number") ?? "").trim();
  if (!/^01\d{9}$/.test(bkashNumber)) return { error: "Enter a valid 11-digit bKash number." };
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage.from("student-id-docs").upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return { error: `Unable to upload ID card: ${uploadError.message}` };
  const { error } = await supabase.rpc("request_seller_verification", { p_university_email: parsed.data.universityEmail, p_bkash_number: bkashNumber });
  if (error) { await admin.storage.from("student-id-docs").remove([path]); return { error: error.message }; }

  const { error: profileUpdateError } = await supabase.from("profiles").update({ student_id_document_url: path }).eq("id", user.id);
  if (profileUpdateError) { await admin.storage.from("student-id-docs").remove([path]); return { error: profileUpdateError.message }; }

  await admin.from("notifications").insert({
    profile_id: user.id,
    type: "seller_verification_pending",
    title: "Seller verification submitted",
    body: "Waiting for admin approval. We will notify you when your seller request is approved or rejected.",
    link: "/notifications",
  });

  revalidatePath("/dashboard/become-seller"); revalidatePath("/admin/sellers"); revalidatePath("/notifications"); revalidatePath("/dashboard");
  return { success: "Verification request submitted. An admin will review your EWU email and ID card." };
}
