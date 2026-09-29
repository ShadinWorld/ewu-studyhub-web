import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_QUICK_ACTIONS } from "@/lib/admin-quick-actions";

export async function POST(
  _request: Request,
  { params }: { params: { actionKey: string } },
) {
  const actionKey = decodeURIComponent(params.actionKey || "");
  if (!ADMIN_QUICK_ACTIONS.some((action) => action.key === actionKey)) {
    return NextResponse.json({ error: "Unknown admin quick action." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.rpc("record_admin_quick_action_use", {
    p_action_key: actionKey,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  return NextResponse.json({ ok: true });
}
