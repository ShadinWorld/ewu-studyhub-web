"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export type AccountFormState = { error?: string; success?: string } | undefined;
function normalizeBangladeshPhone(phone: string) { const digits = phone.replace(/\D/g, ""); return digits.startsWith("01") ? `+880${digits.slice(1)}` : digits; }
export async function completeAccountAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const raw = String(formData.get("phone") ?? "").trim();
  if (!/^01\d{9}$/.test(raw)) return { error: "Enter a valid 11-digit Bangladesh phone number." };
  const phone = normalizeBangladeshPhone(raw);
  const { data: existing } = await supabase.from("profiles").select("id").eq("phone_number", phone).neq("id", user.id).maybeSingle();
  if (existing) return { error: "That phone number is already linked to another account." };
  const { error } = await supabase.from("profiles").update({ phone_number: phone }).eq("id", user.id);
  if (error) return { error: "Unable to save your phone number. Please try again." };
  revalidatePath("/account");
  const next = String(formData.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
