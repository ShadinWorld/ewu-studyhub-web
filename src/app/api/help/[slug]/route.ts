import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let role: "general" | "student" | "seller" | "admin" = "general";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role, is_seller").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin" || profile?.role === "super_admin") role = "admin";
    else if (profile?.is_seller || profile?.role === "seller") role = "seller";
    else role = "student";
  }

  const { data, error } = await supabase
    .from("help_items")
    .select("id, slug, role_scope, title, intro, how_to, benefits, notes, status, sort_order, updated_at")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load help content." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Help content not found." }, { status: 404 });

  if (data.role_scope !== "general" && data.role_scope !== role && role !== "admin") {
    return NextResponse.json({ error: "Help content not available for this account." }, { status: 403 });
  }

  return NextResponse.json({ item: data });
}
