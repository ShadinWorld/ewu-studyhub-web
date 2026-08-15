"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

export async function signInWithGoogleAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = createClient();
  const next = String(formData.get("next") || "/");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const switchEmail = String(formData.get("switchEmail") || "").trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
        ...(switchEmail ? { login_hint: switchEmail } : {}),
      },
    },
  });

  if (error || !data.url) {
    console.error("Google OAuth error:", error);
    return { error: "Unable to continue with Google. Please try again." };
  }

  redirect(data.url);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
