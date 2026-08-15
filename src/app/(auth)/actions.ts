"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

function getSafeNext(formData: FormData) {
  const next = String(formData.get("next") || "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signInWithGoogleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = createClient();

  const safeNext = getSafeNext(formData);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const switchEmail = String(formData.get("switchEmail") || "")
    .trim()
    .toLowerCase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(
        safeNext
      )}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        ...(switchEmail ? { login_hint: switchEmail } : {}),
      },
    },
  });

  if (error || !data.url) {
    console.error("Google OAuth error:", error);
    return {
      error: "Unable to continue with Google. Please try again.",
    };
  }

  redirect(data.url);
}

/**
 * Used when a Google account is already signed in but cannot
 * complete the account because the selected phone number is
 * already linked to another account.
 *
 * This clears the current Supabase session first, then starts
 * Google OAuth again so the user can choose another Google account.
 */
export async function switchGoogleAccountAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = createClient();

  const safeNext = getSafeNext(formData);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Important: remove the currently authenticated Google/Supabase session.
  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(
        safeNext
      )}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    console.error("Google account switch error:", error);
    return {
      error: "Unable to switch Google account. Please try again.",
    };
  }

  redirect(data.url);
}

export async function logoutAction() {
  const supabase = createClient();

  await supabase.auth.signOut();

  redirect("/");
}