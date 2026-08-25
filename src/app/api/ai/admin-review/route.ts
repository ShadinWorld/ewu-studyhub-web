import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generateStructured, GEMINI_MODEL } from "@/lib/ai/gemini";

const schema = {
  type: "object",
  properties: {
    decision_hint: { type: "string", enum: ["approve", "review", "reject"] },
    risk_score: { type: "number" },
    summary: { type: "string" },
    flags: { type: "array", items: { type: "string" } },
    evidence: { type: "array", items: { type: "string" } },
    recommended_checks: { type: "array", items: { type: "string" } },
  },
  required: ["decision_hint", "risk_score", "summary", "flags", "evidence", "recommended_checks"],
};

type ModerationResult = {
  decision_hint: string;
  risk_score: number;
  summary: string;
  flags: string[];
  evidence: string[];
  recommended_checks: string[];
};

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const body = await request.json().catch(() => null) as { fileId?: string } | null;
  if (!body?.fileId) return NextResponse.json({ error: "Resource ID is required." }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: file }, { data: analysis }] = await Promise.all([
    admin.from("files").select("id,title,description,category,pricing_type,price_cents,visibility,course_id,department_id,seller_id,created_at,file_hash").eq("id", body.fileId).single(),
    admin.from("ai_resource_analyses").select("*").eq("file_id", body.fileId).maybeSingle(),
  ]);
  if (!file) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  if (!analysis) return NextResponse.json({ error: "Run seller AI analysis for this resource first." }, { status: 400 });

  const [{ data: seller }, { data: reports }, { data: siblings }, { data: duplicateByHash }, { data: sellerFiles }, { data: similarByEmbedding }] = await Promise.all([
    admin.from("profiles").select("full_name,role,is_seller,created_at").eq("id", file.seller_id).maybeSingle(),
    admin.from("reports").select("reason,status,created_at").eq("file_id", file.id).neq("status", "dismissed"),
    admin.from("files").select("id,title,description,course_id,department_id,visibility,seller_id,file_hash,created_at").neq("id", file.id).or(`title.ilike.%${String(file.title).slice(0, 40).replace(/[%_,]/g, " ")}%`).limit(12),
    file.file_hash
      ? admin.from("files").select("id,title,seller_id,visibility").eq("file_hash", file.file_hash).neq("id", file.id).limit(5)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; seller_id: string; visibility: string }> }),
    admin.from("files").select("id,visibility,created_at,course_id,department_id,title,description").eq("seller_id", file.seller_id).order("created_at", { ascending: false }).limit(2000),
    analysis.ai_embedding ? admin.rpc("search_admin_ai_similar_resources", { p_file_id: file.id, p_query_embedding: analysis.ai_embedding, p_limit: 12 }) : Promise.resolve({ data: [] as Array<{ file_id: string; title: string | null; seller_id: string; similarity: number; visibility: string }> }),
  ]);

  const sellerRows = sellerFiles ?? [];
  const totalDecided = sellerRows.filter((row) => row.visibility === "published" || row.visibility === "rejected").length;
  const rejectedCount = sellerRows.filter((row) => row.visibility === "rejected").length;
  const publishedCount = sellerRows.filter((row) => row.visibility === "published").length;
  const recent30 = sellerRows.filter((row) => new Date(row.created_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000 && row.visibility !== "archived").length;
  const sellerDecisionRate = totalDecided ? publishedCount / totalDecided : null;
  const similar = (similarByEmbedding ?? []).filter((row) => Number(row.similarity) >= 0.84).slice(0, 8);
  const deterministicFactors = {
    exact_hash_duplicate_count: duplicateByHash?.length ?? 0,
    title_similarity_candidates: (siblings ?? []).length,
    semantic_similarity_candidates: similar.map((row) => ({ file_id: row.file_id, title: row.title, similarity: Number(row.similarity), seller_id: row.seller_id })),
    report_count: reports?.length ?? 0,
    uploads_last_30_days: recent30,
    seller_total_decided: totalDecided,
    seller_rejected: rejectedCount,
    seller_published: publishedCount,
    seller_approval_rate: sellerDecisionRate,
    prior_ai_risk_score: Number(analysis.moderation_risk_score || 0),
    prior_ai_flags: Array.isArray(analysis.moderation_flags) ? analysis.moderation_flags : [],
  };

  let deterministicRisk = Number(analysis.moderation_risk_score || 0);
  const deterministicFlags: string[] = [];
  if ((duplicateByHash?.length ?? 0) > 0) { deterministicRisk += 45; deterministicFlags.push("Exact file hash duplicate exists in the catalog."); }
  if (similar.length > 0) { deterministicRisk += 20; deterministicFlags.push(`Found ${similar.length} semantically similar resource${similar.length === 1 ? "" : "s"} at or above the 0.84 similarity threshold.`); }
  if ((reports?.length ?? 0) >= 2) { deterministicRisk += 15; deterministicFlags.push(`${reports?.length ?? 0} non-dismissed reports are attached to this resource.`); }
  if (recent30 >= 15) { deterministicRisk += 10; deterministicFlags.push(`Seller has ${recent30} non-removed uploads in the last 30 days.`); }
  if (sellerDecisionRate !== null && totalDecided >= 5 && sellerDecisionRate < 0.7) { deterministicRisk += 10; deterministicFlags.push(`Seller approval rate is ${(sellerDecisionRate * 100).toFixed(0)}% across ${totalDecided} decided resources.`); }
  deterministicRisk = Math.min(100, deterministicRisk);

  const context = {
    resource: file,
    seller: seller || null,
    ai_analysis: {
      group_type: analysis.ai_group_type,
      title: analysis.ai_title,
      description: analysis.ai_description,
      course_code: analysis.ai_course_code,
      category: analysis.ai_category,
      semester: analysis.ai_semester,
      year: analysis.ai_year,
      topics: analysis.ai_topics,
      tags: analysis.ai_tags,
      summary: analysis.ai_summary,
      content_index: analysis.ai_content_index,
      file_breakdown: analysis.ai_file_breakdown,
      group_conflicts: analysis.ai_group_conflicts,
      confidence: analysis.ai_confidence,
    },
    prior_signals: {
      flags: analysis.moderation_flags,
      risk_score: analysis.moderation_risk_score,
      reports: reports || [],
      seller_edited_at: analysis.seller_edited_at,
    },
    similar_candidates: siblings || [],
  };

  try {
    const result = await generateStructured<ModerationResult>({
      model: GEMINI_MODEL,
      schema,
      prompt: `You are EWU StudyHub's admin moderation assistant. This is advisory decision support only. Never invent evidence, never expose private user data, and never make an irreversible decision. Review the supplied resource metadata, AI understanding, seller signals, deterministic moderation factors, report signals, and similarity candidates. Focus on course/content mismatch, duplicate or copied material risk, mixed-bundle conflicts, suspicious/low-information metadata, spam-like content, and unusual seller/resource risk. Treat deterministic factors as evidence, not proof, and never invent missing details. Use approve only when evidence is clean, reject only for clear policy-level problems, otherwise use review. Keep evidence concise and directly grounded in the supplied data.\n\nDATA:\n${JSON.stringify(context).slice(0, 28000)}`,
    });

    const normalized = {
      decision_hint: ["approve", "review", "reject"].includes(result.decision_hint) ? result.decision_hint : "review",
      risk_score: Math.max(0, Math.min(100, Number(result.risk_score || 0))),
      summary: String(result.summary || "Review the resource manually.").slice(0, 1800),
      flags: Array.isArray(result.flags) ? result.flags.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
      evidence: Array.isArray(result.evidence) ? result.evidence.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
      recommended_checks: Array.isArray(result.recommended_checks) ? result.recommended_checks.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
    };

    await admin.from("ai_resource_analyses").update({
      moderation_summary: normalized.summary,
      moderation_flags: normalized.flags,
      moderation_risk_score: normalized.risk_score,
      moderation_evidence: [...deterministicFlags, ...normalized.evidence, ...normalized.recommended_checks],
      moderation_factors: deterministicFactors,
      moderation_decision_hint: normalized.decision_hint,
      moderation_reviewed_at: new Date().toISOString(),
      moderation_model: GEMINI_MODEL,
      updated_at: new Date().toISOString(),
    }).eq("file_id", file.id);
    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "ai.resource_moderation_review",
      target_table: "files",
      target_id: file.id,
      metadata: { decision_hint: normalized.decision_hint, risk_score: normalized.risk_score, deterministic_risk: deterministicRisk, deterministic_flags: deterministicFlags.length },
    });
    return NextResponse.json(normalized);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI moderation review failed." }, { status: 502 });
  }
}
