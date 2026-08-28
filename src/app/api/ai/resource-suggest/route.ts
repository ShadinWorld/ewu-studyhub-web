import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStructured, GEMINI_SELLER_MODEL, GeminiApiError } from "@/lib/ai/gemini";
import { resourceSuggestionSchema, type FileBreakdown, type ResourceSuggestion } from "@/lib/ai/resource-suggestion-schema";

const allowedCategories = ["notes", "quiz_questions", "mid_questions", "final_questions", "assignment", "lab_report", "project", "presentation_slide", "research_report"];
const AI_ANALYSIS_VERSION = "seller-upload-v3.3-fast-input";
const CACHE_TTL_DAYS = 30;

function normalizeBreakdown(entries: unknown, selectedFiles: File[]): FileBreakdown[] {
  const raw = Array.isArray(entries) ? entries : [];
  return selectedFiles.map((file, index) => {
    const entry = (raw[index] && typeof raw[index] === "object") ? raw[index] as Record<string, unknown> : {};
    const topics = Array.isArray(entry.topics) ? entry.topics.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
    const suggestedSections = Array.isArray(entry.suggested_sections) ? entry.suggested_sections.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
    return {
      file_name: file.name,
      role: String(entry.role || "Resource file").slice(0, 120),
      summary: String(entry.summary || "").slice(0, 1200),
      topics,
      suggested_sections: suggestedSections,
    };
  });
}

async function buildRequestHash(files: File[]) {
  const hash = createHash("sha256");
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    hash.update(Buffer.from(`${file.name}\0${file.type || "application/octet-stream"}\0${bytes.length}\0`));
    hash.update(bytes);
    hash.update(Buffer.from("\0"));
  }
  return hash.digest("hex");
}

function transientResponse(error: unknown) {
  if (error instanceof GeminiApiError) {
    if (error.retryable) {
      const retryAfterSeconds = Math.max(5, Math.min(30, error.retryAfterSeconds || 8));
      return NextResponse.json(
        { error: "Gemini is temporarily busy. Please try again in a moment.", retryable: true, retryAfterSeconds },
        { status: error.status === 429 ? 429 : 503, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ error: error.message }, { status: error.status || 502 });
  }
  const message = error instanceof Error ? error.message : "AI analysis failed.";
  return NextResponse.json({ error: message }, { status: 502 });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).single();
  if (!profile?.is_seller && !["seller", "admin", "super_admin"].includes(String(profile?.role))) {
    return NextResponse.json({ error: "Seller access is required." }, { status: 403 });
  }

  const formData = await request.formData();
  const consent = String(formData.get("aiConsent") || "false") === "true";
  if (!consent) return NextResponse.json({ error: "AI processing is disabled for this upload." }, { status: 400 });

  const files = formData.getAll("files").filter((value): value is File => value instanceof File).slice(0, 3);
  if (!files.length) return NextResponse.json({ error: "Select at least one file." }, { status: 400 });

  const requestHash = await buildRequestHash(files);
  const cacheModel = GEMINI_SELLER_MODEL;
  const { data: cached } = await supabase
    .from("ai_generation_cache")
    .select("id,status,result,expires_at,error_message,updated_at")
    .eq("owner_id", user.id)
    .eq("feature", "seller_resource_suggest")
    .eq("request_hash", requestHash)
    .eq("analysis_version", AI_ANALYSIS_VERSION)
    .eq("model", cacheModel)
    .maybeSingle();

  if (cached?.status === "completed" && cached.result && (!cached.expires_at || new Date(cached.expires_at).getTime() > Date.now())) {
    await supabase.from("ai_generation_cache").update({ last_used_at: new Date().toISOString() }).eq("id", cached.id);
    return NextResponse.json({ ...(cached.result as Record<string, unknown>), cached: true });
  }

  if (cached?.status === "processing" && new Date(cached.updated_at).getTime() > Date.now() - 2 * 60 * 1000) {
    return NextResponse.json({ error: "This exact file set is already being analyzed. Please wait a moment and try again.", retryable: true, retryAfterSeconds: 8 }, { status: 409, headers: { "Retry-After": "8" } });
  }

  const cachePayload = {
    owner_id: user.id,
    feature: "seller_resource_suggest",
    request_hash: requestHash,
    analysis_version: AI_ANALYSIS_VERSION,
    model: cacheModel,
    status: "processing" as const,
    result: null,
    error_message: null,
    last_used_at: null,
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };

  if (cached?.id) {
    await supabase.from("ai_generation_cache").update(cachePayload).eq("id", cached.id);
  } else {
    const { error: insertError } = await supabase.from("ai_generation_cache").insert(cachePayload);
    if (insertError && !/duplicate|unique/i.test(insertError.message)) {
      return NextResponse.json({ error: "AI cache could not be initialized." }, { status: 500 });
    }
    if (insertError) {
      const { data: concurrent } = await supabase
        .from("ai_generation_cache")
        .select("id,status,result,expires_at,updated_at")
        .eq("owner_id", user.id)
        .eq("feature", "seller_resource_suggest")
        .eq("request_hash", requestHash)
        .eq("analysis_version", AI_ANALYSIS_VERSION)
        .eq("model", cacheModel)
        .maybeSingle();
      if (concurrent?.status === "completed" && concurrent.result) return NextResponse.json({ ...(concurrent.result as Record<string, unknown>), cached: true });
      if (concurrent?.status === "processing") return NextResponse.json({ error: "This exact file set is already being analyzed. Please wait a moment and try again.", retryable: true, retryAfterSeconds: 8 }, { status: 409, headers: { "Retry-After": "8" } });
    }
  }

  const [{ data: courses }, { data: departments }] = await Promise.all([
    supabase.from("courses").select("course_code, course_name, department_id").order("course_code").limit(1000),
    supabase.from("departments").select("name, short_name").order("short_name").limit(200),
  ]);

  const context = `Known EWU courses (use only when evidence supports it): ${(courses ?? []).map((c) => `${c.course_code} — ${c.course_name}`).join("; ")}\nKnown departments: ${(departments ?? []).map((d) => `${d.short_name} — ${d.name}`).join("; ")}\nAllowed categories: ${allowedCategories.join(", ")}.`;
  const bytesParts = await Promise.all(files.map(async (file) => ({
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || "application/octet-stream",
    name: file.name,
  })));

  try {
    const result = await generateStructured<ResourceSuggestion>({
      model: cacheModel,
      thinkingLevel: "minimal",
      maxOutputTokens: 4200,
      maxRetries: 0,
      fastPath: true,
      fileParts: bytesParts,
      schema: resourceSuggestionSchema,
      prompt: `You are EWU StudyHub's seller upload assistant. Analyze the selected file set as one resource submission. Files may be one file, multiple related files, or multiple unrelated files. Use evidence from the provided files, including scanned pages, photos, handwritten notes, diagrams, tables and normal PDFs. For speed, prefer the clearest evidence needed to fill the seller fields; do not produce long prose.\n\nRules:\n1. First classify the set as single, related_bundle, or mixed_bundle.\n2. Always produce a useful title, description, summary and TOC even for mixed/unrelated files. The seller should not be forced to start over.\n3. If related, produce one coherent bundle title/description/TOC and a per-file breakdown.\n4. If mixed, never invent a shared course/topic. Set uncertain structured fields to null, explain conflicts, but still produce an umbrella title such as a concise “Study Materials Bundle — …” based on what is actually present.\n5. Never invent course codes, semesters, years, topics or claims. Prefer null when evidence is insufficient.\n6. TOC for multiple files must make clear which sections belong to which file.\n7. moderation_precheck is advisory: flag visible quality concerns, course/content mismatch, low-information or suspicious content, and possible duplicate-like wording. Do not make a final moderation decision.\n8. Use concise English metadata even when content is Bengali or mixed-language.\n9. Keep file_breakdown aligned to the selected file order.\n\n${context}\n\nThe seller will review and can edit every suggested field before final submission.`,
    });

    const normalized = {
      ...result,
      group_type: result.group_type === "related_bundle" || result.group_type === "mixed_bundle" ? result.group_type : "single",
      title: String(result.title || "Study Materials").trim().slice(0, 150),
      description: String(result.description || "Study materials analyzed by StudyHub AI.").trim().slice(0, 2000),
      table_of_contents: String(result.table_of_contents || "Key topics identified by StudyHub AI.").trim().slice(0, 3000),
      summary: String(result.summary || result.description || "").trim().slice(0, 6000),
      category: result.category && allowedCategories.includes(result.category) ? result.category : null,
      tags: Array.isArray(result.tags) ? result.tags.filter((x): x is string => typeof x === "string").slice(0, 30) : [],
      topics: Array.isArray(result.topics) ? result.topics.filter((x): x is string => typeof x === "string").slice(0, 40) : [],
      group_conflicts: Array.isArray(result.group_conflicts) ? result.group_conflicts.filter((x): x is string => typeof x === "string").slice(0, 12) : [],
      file_breakdown: normalizeBreakdown(result.file_breakdown, files),
      moderation_precheck: {
        flags: Array.isArray(result.moderation_precheck?.flags) ? result.moderation_precheck.flags.filter((x): x is string => typeof x === "string").slice(0, 20) : [],
        risk_score: Math.max(0, Math.min(100, Number(result.moderation_precheck?.risk_score || 0))),
        rationale: String(result.moderation_precheck?.rationale || "").slice(0, 1500),
      },
      confidence: Math.max(0, Math.min(1, Number(result.confidence || 0))),
      model: cacheModel,
      analysis_version: AI_ANALYSIS_VERSION,
    };

    await supabase.from("ai_generation_cache").update({ status: "completed", result: normalized, error_message: null, updated_at: new Date().toISOString(), last_used_at: new Date().toISOString() }).eq("owner_id", user.id).eq("feature", "seller_resource_suggest").eq("request_hash", requestHash).eq("analysis_version", AI_ANALYSIS_VERSION).eq("model", cacheModel);
    return NextResponse.json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis failed.";
    await supabase.from("ai_generation_cache").update({ status: "failed", error_message: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("owner_id", user.id).eq("feature", "seller_resource_suggest").eq("request_hash", requestHash).eq("analysis_version", AI_ANALYSIS_VERSION).eq("model", cacheModel);
    return transientResponse(error);
  }
}
