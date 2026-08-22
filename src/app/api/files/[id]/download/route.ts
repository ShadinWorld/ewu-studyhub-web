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

  const { data: file } = await supabase.from("files").select("id, storage_path, pricing_type, price_cents, visibility, seller_id, title").eq("id", params.id).single();
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const isOwner = file.seller_id === user.id;
  if (file.visibility !== "published" && file.visibility !== "archived") return NextResponse.json({ error: "File not found." }, { status: 404 });
  let purchaseId: string | null = null;

  if ((file.pricing_type === "paid" || file.visibility === "archived") && !isOwner) {
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
  const safeTitle = (file.title || "studyhub-resource").replace(/[\\/:*?"<>|]+/g, "-").trim() || "studyhub-resource";
  const sourceExt = String(file.storage_path || "").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
  const safeFilename = /\.[a-z0-9]{1,6}$/i.test(safeTitle) || !sourceExt ? safeTitle : `${safeTitle}.${sourceExt}`;
  const { data: signed, error } = await admin.storage
    .from("files-private")
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
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

  const upstream = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Could not download the file." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Disposition", `attachment; filename="${safeFilename.replace(/"/g, "")}"; filename*=UTF-8\'\'${encodeURIComponent(safeFilename)}`);
  headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "private, no-store, max-age=0");

  return new NextResponse(upstream.body, { status: 200, headers });
}
