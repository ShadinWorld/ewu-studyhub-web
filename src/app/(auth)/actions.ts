"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema, forgotPasswordSchema } from "@/lib/validations";

export type FormState = { error?: string; success?: string } | undefined;

export async function signupAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (existing) return { error: "That username is already taken." };

  // With "Confirm email" turned OFF in Supabase (Authentication → Sign In /
  // Providers → Email), signUp() returns an already-active session — no
  // email is sent, no link to click. The person is logged in immediately.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, username: parsed.data.username },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed. Please try again." };

  redirect("/");
}

export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.message.toLowerCase().includes("confirm")) {
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    }
    return { error: "Invalid email or password." };
  }

  redirect("/");
}

export async function forgotPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  if (error) console.error("resetPasswordForEmail error:", error.message);
  return { success: "If that email is registered, a reset link has been sent." };
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
