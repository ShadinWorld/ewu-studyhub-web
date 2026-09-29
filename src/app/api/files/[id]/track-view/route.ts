import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: file } = await admin
    .from("files")
    .select("id, title, seller_id, visibility")
    .eq("id", params.id)
    .maybeSingle();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ tracked: false }, { status: 404 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  // The browser performs a 30-minute client-side dedupe before calling this
  // endpoint. Keeping the server endpoint intentionally small prevents the
  // resource detail page from incrementing the counter during every RSC
  // render/revalidation.
  const { error: incrementError } = await admin.rpc("increment_view_count", { p_file_id: file.id });
  if (incrementError) {
    return NextResponse.json({ error: "Unable to record resource view." }, { status: 500 });
  }

  if (user) {
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

  return NextResponse.json({ tracked: true, nextAllowedAt: Date.now() + DEDUPE_WINDOW_MS }, { status: 200 });
}
