import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, seller_id, storage_path, pricing_type, visibility, upload_batch_id")
    .eq("id", params.id)
    .single();

  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = Boolean(user && file.seller_id === user.id);
  if (file.visibility === "archived" && !isOwner && !user) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.visibility !== "published" && file.visibility !== "archived") return NextResponse.json({ error: "File not found." }, { status: 404 });

  if ((file.pricing_type === "paid" || file.visibility === "archived") && !isOwner) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `/files/${params.id}`);
      return NextResponse.redirect(loginUrl);
    }

    const { data: siblings } = file.upload_batch_id ? await supabase.from("files").select("id").eq("upload_batch_id", file.upload_batch_id) : { data: [{ id: file.id }] };
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .in("file_id", (siblings ?? []).map((row) => row.id));

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
