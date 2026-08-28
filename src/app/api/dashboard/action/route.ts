import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ACTIONS = new Set([
  "browse", "purchases", "saved", "requests", "notifications", "history", "tools", "courses", "account",
  "upload", "sales", "payment-settings",
]);

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { actionId?: string; href?: string; label?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const actionId = String(body.actionId ?? "").trim();
  const href = String(body.href ?? "").trim();
  const label = String(body.label ?? "").trim();

  if (!ALLOWED_ACTIONS.has(actionId) || !href.startsWith("/") || href.startsWith("//")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabase.rpc("record_user_activity", {
    p_actor_id: user.id,
    p_action: "dashboard.quick_action",
    p_entity_type: "dashboard",
    p_entity_id: user.id,
    p_description: `Opened ${label || actionId}`,
    p_metadata: { action_id: actionId, href },
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
