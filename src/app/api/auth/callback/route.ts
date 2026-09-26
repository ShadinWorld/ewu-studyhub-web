import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const EWU_STUDENT_EMAIL = /^[0-9]{4}-[0-9]-[0-9]{2}-[0-9]{3}@std\.ewubd\.edu$/i;

function loginErrorRedirect(origin: string, code: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) return loginErrorRedirect(origin, "auth_callback_failed");

  const supabase = createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth callback exchange error:", exchangeError);
    return loginErrorRedirect(origin, "auth_callback_failed");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loginErrorRedirect(origin, "auth_callback_failed");

  const metadata = user.user_metadata ?? {};
  const fullName = metadata.full_name || metadata.name || "New User";
  const avatarUrl = metadata.avatar_url || metadata.picture || null;
  const normalizedEmail = String(user.email ?? "").trim().toLowerCase();
  const isEwuStudent = EWU_STUDENT_EMAIL.test(normalizedEmail);
  const admin = createAdminClient();

  // The database trigger normally creates the profile. This callback keeps the
  // OAuth flow self-healing if a production trigger/profile write ever misses.
  const { data: existingProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("id, role, is_seller, university_email, university_email_verified, student_id, student_id_verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error("OAuth profile lookup error:", profileReadError);
    return loginErrorRedirect(origin, "account_setup_failed");
  }

  if (!existingProfile) {
    const { error: profileInsertError } = await admin.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      role: isEwuStudent ? "seller" : "student",
      is_seller: isEwuStudent,
      phone_number: null,
      university_email: isEwuStudent ? normalizedEmail : null,
      university_email_verified: isEwuStudent,
      student_id: isEwuStudent ? normalizedEmail.split("@")[0] : null,
      student_id_verification_status: isEwuStudent ? "verified" : "unverified",
    });

    if (profileInsertError) {
      console.error("OAuth profile provisioning error:", profileInsertError);
      await supabase.auth.signOut();
      return loginErrorRedirect(origin, "account_setup_failed");
    }

    if (isEwuStudent) {
      const { error: notificationError } = await admin.from("notifications").insert({
        profile_id: user.id,
        type: "seller_approved",
        title: "You are an EWU verified seller",
        body: "Your EWU student email verified you as a seller automatically. Add your bKash number when you want to publish paid resources or receive earnings.",
        link: "/dashboard/payment-settings",
      });
      if (notificationError) console.warn("Auto-seller notification could not be created:", notificationError.message);
    }
  } else {
    // Direct EWU Google sign-in is a trusted seller signal for the current
    // product rule. Repair legacy profiles that were created before this rule.
    const profileUpdate = isEwuStudent && (!existingProfile.is_seller || existingProfile.role !== "seller")
      ? {
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
          role: "seller" as const,
          is_seller: true,
          university_email: normalizedEmail,
          university_email_verified: true,
          student_id: normalizedEmail.split("@")[0],
          student_id_verification_status: "verified" as const,
        }
      : {
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        };

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("OAuth profile update error:", profileUpdateError);
      return loginErrorRedirect(origin, "account_setup_failed");
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
