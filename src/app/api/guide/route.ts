import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { role: string | null; is_seller: boolean | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, is_seller")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  const [{ data: sections, error }, { data: overview, error: overviewError }] = await Promise.all([
    supabase
      .from("guide_sections")
      .select("id, slug, section_group, title, summary, what_is, how_to, benefits, notes, action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href, sort_order, updated_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
    supabase
      .from("guide_overview_items")
      .select("id, slug, role_scope, kind, title, summary, benefit, action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href, sort_order, updated_at")
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
  ]);

  if (error || overviewError) {
    return NextResponse.json({ error: "Unable to load the User Guide." }, { status: 500 });
  }

  const isAuthenticated = Boolean(user);
  const role: "guest" | "student" | "seller" | "admin" = !user
    ? "guest"
    : profile?.role === "admin" || profile?.role === "super_admin"
      ? "admin"
      : profile?.is_seller || profile?.role === "seller"
        ? "seller"
        : "student";
  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");
  // Any authenticated non-admin/non-seller account is treated as Student for guide access.
  // This guide-level flag must not be confused with protected feature authorization.
  const studentAccess = isAuthenticated && (role === "student" || role === "seller" || role === "admin");

  const visible = (sections ?? []).filter((section) => section.section_group !== "admin" || role === "admin");
  const visibleOverview = (overview ?? []).filter((item) => item.role_scope !== "admin" || role === "admin");

  return NextResponse.json({
    isAuthenticated,
    role,
    isSeller,
    studentAccess,
    overview: visibleOverview,
    sections: visible,
  }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
}
