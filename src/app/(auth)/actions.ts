"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema, forgotPasswordSchema } from "@/lib/validations";

export type FormState = { error?: string; success?: string } | undefined;

export async function signupAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = createClient();
  const normalizedPhone = normalizeBangladeshPhone(parsed.data.phone);

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();
  if (existing) return { error: "That username is already taken." };

  const { data: existingPhone } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();
  if (existingPhone) return { error: "That phone number is already linked to an account." };

  // With "Confirm email" turned OFF in Supabase (Authentication → Sign In /
  // Providers → Email), signUp() returns an already-active session — no
  // email is sent, no link to click. The person is logged in immediately.
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, username: parsed.data.username, phone_number: normalizedPhone },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed. Please try again." };

  redirect("/");
}

function normalizeBangladeshPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("01") ? `+880${digits.slice(1)}` : digits;
}

export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid input" };

  const identifier = parsed.data.identifier;
  let email = identifier;

  if (!identifier.includes("@")) {
    const phone = normalizeBangladeshPhone(identifier);
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone_number", phone)
      .maybeSingle();

    if (!profile) return { error: "Invalid email/phone or password." };

    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);
    if (authUserError || !authUser.user?.email) return { error: "Invalid email/phone or password." };
    email = authUser.user.email;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) {
    if (error.message.toLowerCase().includes("confirm")) {
      redirect(`/verify-email?email=${encodeURIComponent(email)}`);
    }
    return { error: "Invalid email/phone or password." };
  }

  redirect("/");
}

export async function forgotPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Enter your account email and phone number." };

  const admin = createAdminClient();
  const normalizedPhone = normalizeBangladeshPhone(parsed.data.phone);

  // Supabase Auth Admin API does not expose getUserByEmail in this version.
  // Find the account through the phone stored in profiles, then verify the
  // submitted email against the Auth user before starting the reset flow.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, phone_number")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  if (profileError || !profile?.id || profile.phone_number !== normalizedPhone) {
    return { error: "The email and phone number do not match an account." };
  }

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(profile.id);
  const accountEmail = authUser.user?.email?.toLowerCase();
  if (authUserError || !accountEmail || accountEmail !== parsed.data.email.toLowerCase()) {
    return { error: "The email and phone number do not match an account." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  if (error) {
    console.error("resetPasswordForEmail error:", error.message);
    return { error: "Unable to start password reset. Please try again." };
  }

  return { success: "A password reset link has been sent to your email. Open it to create a new password." };
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
