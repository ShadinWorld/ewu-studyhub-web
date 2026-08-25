import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { embedText, generateStructured, GEMINI_EMBED_MODEL, GEMINI_SELLER_MODEL } from "@/lib/ai/gemini";
import { resourceSuggestionSchema, type ResourceSuggestion } from "@/app/api/ai/resource-suggest/route";

function safeString(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) : ""; }
function fileName(path: string) { return path.split("/").pop() || "resource"; }

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { fileIds?: string[] };
  const fileIds = Array.from(new Set(Array.isArray(body.fileIds) ? body.fileIds.filter((id): id is string => typeof id === "string").slice(0, 3) : []));
  if (!fileIds.length) return NextResponse.json({ error: "No resource IDs supplied." }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isAdmin = ["admin", "super_admin"].includes(String(profile?.role));
  let fileQuery = admin.from("files").select("id,seller_id,storage_path,file_kind,title,description,category,course_id,department_id,semester,year,visibility").in("id", fileIds).eq("visibility", "draft");
  if (!isAdmin) fileQuery = fileQuery.eq("seller_id", user.id);
  const { data: files, error } = await fileQuery.order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!files?.length) return NextResponse.json({ error: "No pending resources found." }, { status: 404 });

  const fileParts: Array<{ bytes: Buffer; mimeType: string; name: string }> = [];
  for (const file of files) {
    const { data: blob, error: downloadError } = await admin.storage.from("files-private").download(file.storage_path);
    if (downloadError || !blob) continue;
    const mimeType = file.file_kind === "pdf" ? "application/pdf" : file.file_kind === "image" ? "image/jpeg" : "application/octet-stream";
    fileParts.push({ bytes: Buffer.from(await blob.arrayBuffer()), mimeType, name: fileName(file.storage_path) });
  }
  if (!fileParts.length) return NextResponse.json({ error: "Could not read uploaded resources." }, { status: 502 });

  const prompt = `You are EWU StudyHub's internal resource-understanding service. Analyze this submitted file set for metadata, search indexing, and admin moderation. The seller may not have used optional AI Autofill, so always produce best-effort metadata.
Rules: classify single/related_bundle/mixed_bundle; always provide a useful title, description and TOC; for mixed files, make the TOC file-by-file rather than inventing a common topic; infer course/category/semester/year only when supported; extract tags/topics/summary/difficulty; understand scanned pages, handwriting, diagrams and tables; never invent unsupported facts. Keep output concise.
Current seller-entered metadata context: ${JSON.stringify(files.map((file) => ({ file_name: fileName(file.storage_path), title: file.title, description: file.description, category: file.category, semester: file.semester, year: file.year })).slice(0, 3))}`;

  let analysis: ResourceSuggestion;
  try {
    analysis = await generateStructured<ResourceSuggestion>({ prompt, schema: resourceSuggestionSchema, model: GEMINI_SELLER_MODEL, fileParts, thinkingLevel: "minimal", maxOutputTokens: 1800, maxRetries: 0, fastPath: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "System AI analysis failed." }, { status: 502 });
  }

  const aiTags = Array.isArray(analysis.tags) ? analysis.tags.filter((x): x is string => typeof x === "string").slice(0, 30) : [];
  const aiTopics = Array.isArray(analysis.topics) ? analysis.topics.filter((x): x is string => typeof x === "string").slice(0, 40) : [];
  const groupConflicts = Array.isArray(analysis.group_conflicts) ? analysis.group_conflicts.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
  const moderationFlags = Array.isArray(analysis.moderation_precheck?.flags) ? analysis.moderation_precheck.flags.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
  const breakdown = Array.isArray(analysis.file_breakdown) ? analysis.file_breakdown.slice(0, files.length) : [];
  const document = [analysis.title, analysis.description, analysis.table_of_contents, analysis.course_code, analysis.department_short_name, analysis.category, analysis.semester, analysis.year, analysis.summary, analysis.difficulty, analysis.reading_time_minutes, analysis.group_type, ...aiTags, ...aiTopics, ...groupConflicts, ...breakdown.flatMap((entry) => [entry.file_name, entry.role, entry.summary, ...(entry.topics || []), ...(entry.suggested_sections || [])])].filter((v) => v !== null && v !== undefined && String(v).trim()).join(" ").slice(0, 16000);
  let embedding: number[] | null = null;
  try { embedding = await embedText({ text: document, title: analysis.title || "EWU StudyHub resource", taskType: "RETRIEVAL_DOCUMENT", model: GEMINI_EMBED_MODEL, outputDimensionality: 768 }); } catch { /* backfill later */ }

  const risk = Math.max(0, Math.min(100, Number(analysis.moderation_precheck?.risk_score || 0)));
  for (const file of files) {
    await admin.from("ai_resource_analyses").upsert({
      file_id: file.id, seller_id: file.seller_id, status: "completed", model: GEMINI_SELLER_MODEL,
      ai_title: analysis.title || null, ai_description: analysis.description || null, ai_course_code: analysis.course_code || null,
      ai_course_name: null, ai_department_name: analysis.department_short_name || null, ai_category: analysis.category || null,
      ai_semester: analysis.semester || null, ai_year: analysis.year || null, ai_tags: aiTags, ai_topics: aiTopics, ai_summary: analysis.summary || null,
      ai_content_index: document, ai_search_document: document, ai_embedding: embedding, ai_embedding_model: embedding ? GEMINI_EMBED_MODEL : null,
      ai_embedding_updated_at: embedding ? new Date().toISOString() : null, ai_difficulty: analysis.difficulty || null,
      ai_reading_time_minutes: typeof analysis.reading_time_minutes === "number" ? analysis.reading_time_minutes : null,
      ai_confidence: typeof analysis.confidence === "number" ? Math.max(0, Math.min(1, analysis.confidence)) : null,
      moderation_flags: moderationFlags, moderation_risk_score: risk, source_consent: false,
      ai_group_type: analysis.group_type, ai_file_breakdown: breakdown, ai_group_conflicts: groupConflicts, ai_raw_analysis: analysis as unknown as Record<string, unknown>,
      moderation_summary: safeString(analysis.moderation_precheck?.rationale, 1500) || null,
      moderation_evidence: [...groupConflicts, ...moderationFlags], moderation_model: GEMINI_SELLER_MODEL, ai_analysis_version: "system-upload-v1",
      seller_edited_at: null, seller_final_snapshot: { title: file.title || analysis.title, description: file.description || analysis.description, category: file.category || analysis.category, course_id: file.course_id, department_id: file.department_id, semester: file.semester, year: file.year },
      seller_final_ai_metadata: { tags: aiTags, topics: aiTopics, difficulty: analysis.difficulty || null, reading_time_minutes: analysis.reading_time_minutes ?? null },
      processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    if (!file.course_id && analysis.course_code) {
      const { data: course } = await admin.from("courses").select("id,department_id").ilike("course_code", analysis.course_code).limit(1).maybeSingle();
      if (course) await admin.from("files").update({ course_id: course.id, department_id: course.department_id }).eq("id", file.id).eq("visibility", "draft").eq("seller_id", user.id);
    }
  }
  return NextResponse.json({ processed: files.length, groupType: analysis.group_type, confidence: analysis.confidence });
}
