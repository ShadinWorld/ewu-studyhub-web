import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateImageStructured, GEMINI_MODEL } from "@/lib/ai/gemini";

const schema = {
  type: "object",
  properties: {
    found_email: { type: ["string", "null"] },
    match: { type: "boolean" },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
  required: ["found_email", "match", "confidence", "reason"],
};

interface SellerVerificationResult {
  found_email: string | null;
  match: boolean;
  confidence: number;
  reason: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { data: adminProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!adminProfile || !["admin", "super_admin"].includes(String(adminProfile.role))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null) as { targetUserId?: string } | null;
  const targetUserId = body?.targetUserId;
  if (!targetUserId) return NextResponse.json({ error: "Seller ID is required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id,university_email,student_id_document_url,student_id_verification_status").eq("id", targetUserId).single();
  if (!target?.university_email || !target.student_id_document_url) return NextResponse.json({ error: "EWU email and ID card are required first." }, { status: 400 });

  const { data: signed } = await admin.storage.from("student-id-docs").createSignedUrl(target.student_id_document_url, 180);
  if (!signed?.signedUrl) return NextResponse.json({ error: "Could not access the ID card securely." }, { status: 500 });
  const imageResponse = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!imageResponse.ok) return NextResponse.json({ error: "Could not read the ID card." }, { status: 502 });
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) return NextResponse.json({ error: "Seller ID document is not an image." }, { status: 400 });
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length > 5 * 1024 * 1024) return NextResponse.json({ error: "ID card image is too large for AI verification." }, { status: 400 });

  try {
    const result = await generateImageStructured<SellerVerificationResult>({
      imageBytes: bytes,
      mimeType: contentType,
      schema,
      prompt: `Read only the EWU student email address printed on this ID card. Ignore all other personal information, even if visible. Compare it with the submitted email below after normalizing case and spaces. Do not infer an email if it is not clearly visible. A match is true only when the visible ID-card email exactly matches the submitted email. Submitted email: ${target.university_email}`,
      model: GEMINI_MODEL,
    });
    const submitted = normalizeEmail(target.university_email);
    const found = result.found_email ? normalizeEmail(result.found_email) : null;
    const exactMatch = Boolean(found && found === submitted);
    const status = exactMatch && result.confidence >= 0.85 ? "match" : found ? "mismatch" : "review";
    await admin.from("profiles").update({
      ai_seller_verification_status: status,
      ai_seller_verification_email: found,
      ai_seller_verification_confidence: Math.max(0, Math.min(1, Number(result.confidence || 0))),
      ai_seller_verification_checked_at: new Date().toISOString(),
    }).eq("id", targetUserId);
    await admin.from("audit_logs").insert({ actor_id: user.id, action: "seller.ai_email_verification", target_table: "profiles", target_id: targetUserId, metadata: { status, found_email: found, confidence: result.confidence } });
    return NextResponse.json({ status, found_email: found, confidence: result.confidence, reason: result.reason });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI verification failed." }, { status: 502 });
  }
}
