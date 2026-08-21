import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, seller_id, storage_path, pricing_type, visibility")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const isOwner = Boolean(user && file.seller_id === user.id);

  if (file.pricing_type === "paid" && !isOwner) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `/files/${params.id}`);
      return NextResponse.redirect(loginUrl);
    }

    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", file.id)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!purchase) {
      return NextResponse.redirect(new URL(`/checkout/${file.id}`, request.url));
    }
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("files-private")
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not open this resource." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
