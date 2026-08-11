import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes — enough to review, still short-lived

/**
 * Lets an ADMIN review any file before approving it, or a SELLER view their
 * own upload, without needing a completed purchase. This is intentionally
 * separate from /api/files/[id]/download, which is the buyer-facing,
 * purchase-gated route.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, storage_path, seller_id")
    .eq("id", params.id)
    .single();
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = Boolean(profile && ["admin", "super_admin"].includes(profile.role));
  const isOwner = file.seller_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Not authorized to view this file." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("files-private")
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: "Could not generate preview link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
