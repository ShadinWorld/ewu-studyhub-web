import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const [{ data: profile }, { data: sections, error }] = await Promise.all([
    supabase.from("profiles").select("role, is_seller, student_id_verification_status").eq("id", user.id).maybeSingle(),
    supabase.from("guide_sections").select("id, slug, section_group, title, summary, what_is, how_to, benefits, notes, action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href, sort_order, updated_at").eq("status", "published").order("sort_order", { ascending: true }),
  ]);

  if (error) return NextResponse.json({ error: "Unable to load the User Guide." }, { status: 500 });
  const role = profile?.role === "admin" || profile?.role === "super_admin" ? "admin" : profile?.is_seller || profile?.role === "seller" ? "seller" : "student";
  const visible = (sections ?? []).filter((section) => section.section_group !== "admin" || role === "admin");

  return NextResponse.json({
    role,
    isSeller: Boolean(profile?.is_seller || profile?.role === "seller"),
    verifiedStudent: profile?.student_id_verification_status === "verified" || profile?.role === "verified_student" || profile?.is_seller === true || profile?.role === "seller" || role === "admin",
    sections: visible,
  }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
}
