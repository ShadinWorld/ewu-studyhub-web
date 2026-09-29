import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const VIEW_COOKIE = "ewu_studyhub_viewer";
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function safeVisitorKey(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 120);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  void request;
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: file } = await admin
    .from("files")
    .select("id, title, seller_id, visibility")
    .eq("id", params.id)
    .maybeSingle();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ tracked: false }, { status: 404 });
  }

  const store = cookies();
  let viewerCookie = store.get(VIEW_COOKIE)?.value ?? "";
  let shouldSetCookie = false;

  if (!user && !viewerCookie) {
    viewerCookie = crypto.randomUUID();
    shouldSetCookie = true;
  }

  const visitorKey = user
    ? `user:${user.id}`
    : `guest:${safeVisitorKey(viewerCookie)}`;

  const { data: counted, error: incrementError } = await admin.rpc("record_resource_view", {
    p_file_id: file.id,
    p_visitor_key: visitorKey,
  });

  if (incrementError) {
    return NextResponse.json({ error: "Unable to record resource view." }, { status: 500 });
  }

  if (counted && user) {
    await supabase
      .from("recently_viewed")
      .upsert({ profile_id: user.id, file_id: file.id, viewed_at: new Date().toISOString() });

    await admin.rpc("record_user_activity", {
      p_actor_id: user.id,
      p_action: "resource.view",
      p_entity_type: "resource",
      p_entity_id: file.id,
      p_description: `Viewed resource: ${file.title}`,
      p_metadata: {},
    });
  }

  const response = NextResponse.json({ tracked: Boolean(counted) }, { status: 200 });
  if (shouldSetCookie) {
    response.cookies.set(VIEW_COOKIE, viewerCookie, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VIEW_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return response;
}
