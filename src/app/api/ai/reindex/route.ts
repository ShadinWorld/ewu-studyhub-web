import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { embedTexts, GEMINI_EMBED_MODEL } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "super_admin"].includes(String(profile.role))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { limit?: number };
  const limit = Math.max(1, Math.min(40, Number(body.limit || 20)));
  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("ai_resource_analyses")
    .select("file_id,ai_title,ai_description,ai_course_code,ai_department_name,ai_category,ai_semester,ai_year,ai_tags,ai_topics,ai_summary,ai_content_index,ai_embedding")
    .is("ai_embedding", null)
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documents = (rows ?? []).map((row) => ({
    ...row,
    document: [row.ai_title, row.ai_description, row.ai_course_code, row.ai_department_name, row.ai_category, row.ai_semester, row.ai_year, ...(row.ai_tags || []), ...(row.ai_topics || []), row.ai_summary, row.ai_content_index].filter(Boolean).join(" ").slice(0, 16000),
  }));
  if (!documents.length) return NextResponse.json({ processed: 0, remaining: 0, model: GEMINI_EMBED_MODEL });

  try {
    const vectors = await embedTexts({ texts: documents.map((row) => row.document), titles: documents.map((row) => row.ai_title || "EWU StudyHub resource"), model: GEMINI_EMBED_MODEL, taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 });
    for (let i = 0; i < documents.length; i += 1) {
      await admin.from("ai_resource_analyses").update({
        ai_search_document: documents[i].document,
        ai_content_index: documents[i].document,
        ai_embedding: vectors[i],
        ai_embedding_model: GEMINI_EMBED_MODEL,
        ai_embedding_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("file_id", documents[i].file_id);
    }
    const { count: remaining } = await admin.from("ai_resource_analyses").select("file_id", { count: "exact", head: true }).is("ai_embedding", null);
    return NextResponse.json({ processed: documents.length, remaining: remaining ?? 0, model: GEMINI_EMBED_MODEL });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI reindex failed." }, { status: 502 });
  }
}
