import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60; // short-lived — forces a fresh check every download

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `/files/${params.id}`);
    return NextResponse.redirect(loginUrl);
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, storage_path, pricing_type, price_cents, visibility, seller_id, title")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const isOwner = file.seller_id === user.id;
  let purchaseId: string | null = null;

  if (file.pricing_type === "paid" && !isOwner) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", file.id)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!purchase) {
      // No completed purchase on record — redirect to the checkout flow instead
      // of serving any part of the file. (Checkout / payment gateway integration
      // is Phase 2 — see docs/PHASES.md.)
      return NextResponse.redirect(new URL(`/checkout/${file.id}`, request.url));
    }
    purchaseId = purchase.id;
  }

  // Service-role client bypasses RLS — required to generate a signed URL for
  // a file the buyer doesn't directly own in storage, but only after the
  // purchase check above has already gated access.
  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from("files-private")
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }

  // Log the watermark record for traceability. Actual PDF stamping (buyer
  // name/ID/txn ID burned into the page, or an invisible token) runs in a
  // background worker keyed off this table — see docs/PHASES.md Phase 2.
  if (purchaseId) {
    await admin.from("download_watermarks").insert({
      purchase_id: purchaseId,
      file_id: file.id,
      buyer_id: user.id,
      watermark_text: `${user.id} | ${new Date().toISOString()} | ${purchaseId}`,
    });
  }

  await admin.rpc("increment_download_count", { p_file_id: file.id });

  return NextResponse.redirect(signed.signedUrl);
}
