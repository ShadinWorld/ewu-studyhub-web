import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { embedText, GEMINI_EMBED_MODEL } from "@/lib/ai/gemini";
import { uploadFileSchema } from "@/lib/validations";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB per file
const MAX_BATCH_FILES = 3;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
]);

function mimeToKind(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("presentation")) return "ppt";
  if (mime.includes("word")) return "docx";
  if (mime.startsWith("image/")) return "image";
  return "other";
}

function isZip(file: File) {
  return /\.(zip|rar|7z)$/i.test(file.name) || /zip|compressed/i.test(file.type);
}

async function cleanupUploaded(
  supabase: ReturnType<typeof createClient>,
  uploaded: { storagePath: string; previewStoragePath: string | null }[],
) {
  if (uploaded.length === 0) return;
  await supabase.storage.from("files-private").remove(uploaded.map((x) => x.storagePath));
  const previews = uploaded.map((x) => x.previewStoragePath).filter((x): x is string => Boolean(x));
  if (previews.length) await supabase.storage.from("files-preview").remove(previews);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be logged in to upload." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("university_id, is_seller, role")
    .eq("id", user.id)
    .single();

  const isAdminUploader = profile?.role === "admin" || profile?.role === "super_admin";
  if (!profile?.is_seller && profile?.role !== "seller" && !isAdminUploader) {
    return NextResponse.json({ error: "You need to become a seller before uploading. Go to Dashboard → Become a Seller." }, { status: 403 });
  }

  if (!isAdminUploader) {
    const { data: paymentSettings } = await supabase
      .from("seller_payment_settings")
      .select("bkash_number")
      .eq("seller_id", user.id)
      .maybeSingle();
    if (!paymentSettings?.bkash_number) {
      return NextResponse.json(
        {
          error:
            "আপলোড করার আগে আপনার bKash পেআউট নম্বর যোগ করতে হবে — আপনার রিসোর্স বিক্রি হলে এই নম্বরেই টাকা পাঠানো হবে। Dashboard → Payment Settings এ গিয়ে নম্বরটি যোগ করুন।",
        },
        { status: 403 },
      );
    }
  }

  const formData = await request.formData();
  const rawFiles = formData.getAll("files").filter((value): value is File => value instanceof File);
  const singleFile = formData.get("file");
  const files = rawFiles.length ? rawFiles : singleFile instanceof File ? [singleFile] : [];

  if (files.length === 0) return NextResponse.json({ error: "Please select at least one file." }, { status: 400 });
  if (files.length > MAX_BATCH_FILES) return NextResponse.json({ error: `You can upload a maximum of ${MAX_BATCH_FILES} files at once.` }, { status: 400 });

  for (const file of files) {
    if (isZip(file)) return NextResponse.json({ error: `ZIP/archive files are not supported: ${file.name}` }, { status: 400 });
    if (file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|wmv)$/i.test(file.name)) return NextResponse.json({ error: `${file.name}: video files are not supported on EWU StudyHub.` }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name}: file exceeds the 100MB limit.` }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `${file.name}: unsupported file type.` }, { status: 400 });
  }

  const rawAiAnalysis = String(formData.get("aiAnalysis") || "").trim();
  const rawAiFinalMetadata = String(formData.get("aiFinalMetadata") || "").trim();
  let aiAnalysis: Record<string, unknown> | null = null;
  let aiFinalMetadata: Record<string, unknown> | null = null;
  if (rawAiAnalysis) {
    try {
      const parsedAi = JSON.parse(rawAiAnalysis);
      if (parsedAi && typeof parsedAi === "object") aiAnalysis = parsedAi as Record<string, unknown>;
    } catch {
      aiAnalysis = null;
    }
  }
  if (rawAiFinalMetadata) {
    try {
      const parsedFinal = JSON.parse(rawAiFinalMetadata);
      if (parsedFinal && typeof parsedFinal === "object") aiFinalMetadata = parsedFinal as Record<string, unknown>;
    } catch {
      aiFinalMetadata = null;
    }
  }
  const aiGroupType = aiAnalysis?.group_type === "mixed_bundle" ? "mixed_bundle" : aiAnalysis?.group_type === "related_bundle" ? "related_bundle" : aiAnalysis?.group_type === "single" ? "single" : null;

  const parsed = uploadFileSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    category: formData.get("category"),
    courseId: formData.get("courseId") || undefined,
    departmentId: formData.get("departmentId") || undefined,
    year: formData.get("year") || undefined,
    semester: formData.get("semester") || undefined,
    pricingType: formData.get("pricingType"),
    priceCents: formData.get("pricingType") === "paid" ? formData.get("priceCents") : 0,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });

  const data = parsed.data;
  const tableOfContents = String(formData.get("tableOfContents") ?? "").trim().slice(0, 3000);
  // Course/department may be completed by System AI after submission when Seller AI Autofill was not used.
  if (data.pricingType === "paid" && data.priceCents < 1000) return NextResponse.json({ error: "Paid resources must be priced at least ৳10." }, { status: 400 });

  let universityId = profile.university_id;
  if (!universityId && data.departmentId) {
    const { data: department } = await supabase.from("departments").select("university_id").eq("id", data.departmentId).maybeSingle();
    universityId = department?.university_id ?? null;
  }
  if (!universityId && data.courseId) {
    const { data: course } = await supabase.from("courses").select("department_id").eq("id", data.courseId).maybeSingle();
    if (course?.department_id) {
      const { data: department } = await supabase.from("departments").select("university_id").eq("id", course.department_id).maybeSingle();
      universityId = department?.university_id ?? null;
    }
  }
  if (!universityId) return NextResponse.json({ error: "Could not determine the university for this resource. Please select a valid department/course." }, { status: 400 });

  const admin = createAdminClient();
  const prepared: {
    file: File;
    bytes: Buffer;
    hash: string;
    storagePath: string;
    previewStoragePath: string | null;
    pageCount: number | null;
  }[] = [];
  const uploaded: { storagePath: string; previewStoragePath: string | null }[] = [];
  const insertedIds: string[] = [];
  const seenHashes = new Set<string>();

  try {
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const fileHash = createHash("sha256").update(bytes).digest("hex");
      if (seenHashes.has(fileHash)) throw new Error(`${file.name}: the same file was selected more than once.`);
      seenHashes.add(fileHash);

      const { data: duplicate } = await admin.from("files").select("id, title").eq("file_hash", fileHash).neq("visibility", "rejected").limit(1).maybeSingle();
      if (duplicate) throw new Error(`${file.name}: this file already exists on the platform ("${duplicate.title}").`);

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const storagePath = `${user.id}/${fileHash}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("files-private").upload(storagePath, bytes, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`${file.name}: failed to store the file.`);

      let pageCount: number | null = null;
      let previewStoragePath: string | null = null;
      if (mimeToKind(file.type) === "pdf") {
        try {
          const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
          if (data.pricingType === "free" && pageCount > 0) {
            const previewDoc = await PDFDocument.create();
            const copiedPages = await previewDoc.copyPages(pdfDoc, Array.from({ length: pageCount }, (_, i) => i));
            copiedPages.forEach((p) => previewDoc.addPage(p));
            const previewBytes = await previewDoc.save();
            previewStoragePath = `${user.id}/${fileHash}-preview.pdf`;
            const { error } = await supabase.storage.from("files-preview").upload(previewStoragePath, previewBytes, { contentType: "application/pdf", upsert: false });
            if (error) previewStoragePath = null;
          }
        } catch {
          // Keep the original upload; preview is optional metadata.
        }
      } else if (mimeToKind(file.type) === "image") {
        pageCount = 1;
        if (data.pricingType === "free") {
          previewStoragePath = `${user.id}/${fileHash}-preview.${ext}`;
          const { error } = await supabase.storage.from("files-preview").upload(previewStoragePath, bytes, { contentType: file.type, upsert: false });
          if (error) previewStoragePath = null;
        }
      }

      uploaded.push({ storagePath, previewStoragePath });
      prepared.push({ file, bytes, hash: fileHash, storagePath, previewStoragePath, pageCount });
    }

    const uploadBatchId = files.length > 1 ? randomUUID() : null;
    for (const item of prepared) {
      const { data: inserted, error: insertError } = await supabase
        .from("files")
        .insert({
          seller_id: user.id,
          university_id: universityId,
          department_id: data.departmentId ?? null,
          course_id: data.courseId ?? null,
          title: data.title,
          description: data.description ?? null,
          table_of_contents: tableOfContents || null,
          category: data.category,
          file_kind: mimeToKind(item.file.type),
          language: data.language,
          year: data.year ?? null,
          semester: data.semester ?? null,
          pricing_type: data.pricingType,
          price_cents: data.pricingType === "paid" ? data.priceCents : 0,
          storage_path: item.storagePath,
          preview_storage_path: item.previewStoragePath,
          thumbnail_url: null,
          page_count: item.pageCount,
          file_size_bytes: item.file.size,
          file_hash: item.hash,
          visibility: "draft",
          upload_batch_id: uploadBatchId,
        })
        .select("id")
        .single();
      if (insertError || !inserted) throw new Error(`${item.file.name}: failed to save resource.`);
      insertedIds.push(inserted.id);
      if (aiAnalysis) {
        const finalTitle = data.title;
        const finalDescription = data.description ?? null;
        const finalCategory = data.category;
        const aiTitle = typeof aiAnalysis.title === "string" ? aiAnalysis.title : null;
        const aiDescription = typeof aiAnalysis.description === "string" ? aiAnalysis.description : null;
        const aiCategory = typeof aiAnalysis.category === "string" ? aiAnalysis.category : null;
        const aiSemester = typeof aiAnalysis.semester === "string" ? aiAnalysis.semester : null;
        const aiYear = typeof aiAnalysis.year === "number" ? aiAnalysis.year : null;
        const aiTags = Array.isArray(aiAnalysis.tags) ? aiAnalysis.tags.filter((x): x is string => typeof x === "string").slice(0, 30) : [];
        const aiTopics = Array.isArray(aiAnalysis.topics) ? aiAnalysis.topics.filter((x): x is string => typeof x === "string").slice(0, 40) : [];
        const finalTags = Array.isArray(aiFinalMetadata?.tags) ? aiFinalMetadata.tags.filter((x): x is string => typeof x === "string").slice(0, 30) : aiTags;
        const finalTopics = Array.isArray(aiFinalMetadata?.topics) ? aiFinalMetadata.topics.filter((x): x is string => typeof x === "string").slice(0, 40) : aiTopics;
        const finalDifficulty = typeof aiFinalMetadata?.difficulty === "string" && aiFinalMetadata.difficulty.trim() ? aiFinalMetadata.difficulty.trim().slice(0, 60) : (typeof aiAnalysis.difficulty === "string" ? aiAnalysis.difficulty : null);
        const finalReadingTime = typeof aiFinalMetadata?.reading_time_minutes === "number" ? Math.max(1, Math.min(600, Math.round(aiFinalMetadata.reading_time_minutes))) : (typeof aiAnalysis.reading_time_minutes === "number" ? aiAnalysis.reading_time_minutes : null);
        const aiSummary = typeof aiAnalysis.summary === "string" ? aiAnalysis.summary.slice(0, 6000) : null;
        const aiGroupType = aiAnalysis.group_type === "related_bundle" || aiAnalysis.group_type === "mixed_bundle" ? aiAnalysis.group_type : "single";
        const aiFileBreakdown = Array.isArray(aiAnalysis.file_breakdown) ? aiAnalysis.file_breakdown.slice(0, files.length) : [];
        const aiGroupConflicts = Array.isArray(aiAnalysis.group_conflicts) ? aiAnalysis.group_conflicts.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
        const aiModeration = aiAnalysis.moderation_precheck && typeof aiAnalysis.moderation_precheck === "object" ? aiAnalysis.moderation_precheck as Record<string, unknown> : {};
        const moderationFlags = Array.isArray(aiModeration.flags) ? aiModeration.flags.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
        const moderationRisk = Math.max(0, Math.min(100, Number(aiModeration.risk_score || 0)));
        const moderationRationale = typeof aiModeration.rationale === "string" ? aiModeration.rationale.slice(0, 1500) : null;
        const courseCode = typeof aiAnalysis.course_code === "string" ? aiAnalysis.course_code : null;
        const departmentShort = typeof aiAnalysis.department_short_name === "string" ? aiAnalysis.department_short_name : null;
        const aiSearchDocument = [
          finalTitle, finalDescription, tableOfContents,
          courseCode, departmentShort, finalCategory, data.semester, data.year,
          aiTitle, aiDescription, aiSummary, aiCategory, aiSemester, aiYear,
          aiGroupType, aiGroupConflicts.join(" "), JSON.stringify(aiFileBreakdown),
          ...aiTags, ...aiTopics, ...finalTags, ...finalTopics,
          finalDifficulty, finalReadingTime,
          ...aiFileBreakdown.flatMap((entry) => [entry?.file_name, entry?.role, entry?.summary, ...(Array.isArray(entry?.topics) ? entry.topics : []), ...(Array.isArray(entry?.suggested_sections) ? entry.suggested_sections : [])]),
        ].filter((value) => value !== null && value !== undefined && String(value).trim()).join(" ").slice(0, 16000);
        let embedding: number[] | null = null;
        try {
          embedding = await embedText({
            text: aiSearchDocument,
            title: finalTitle,
            taskType: "RETRIEVAL_DOCUMENT",
            model: GEMINI_EMBED_MODEL,
            outputDimensionality: 768,
          });
        } catch {
          // AI metadata remains usable even if semantic indexing is temporarily unavailable.
        }
        await admin.from("ai_resource_analyses").upsert({
          file_id: inserted.id, seller_id: user.id, status: "completed", model: typeof aiAnalysis.model === "string" ? aiAnalysis.model : null,
          ai_title: aiTitle, ai_description: aiDescription, ai_course_code: courseCode, ai_course_name: null, ai_department_name: departmentShort,
          ai_category: aiCategory, ai_semester: aiSemester, ai_year: aiYear, ai_tags: aiTags, ai_topics: aiTopics, ai_summary: aiSummary,
          ai_content_index: aiSearchDocument, ai_search_document: aiSearchDocument,
          ai_embedding: embedding,
          ai_embedding_model: embedding ? GEMINI_EMBED_MODEL : null,
          ai_embedding_updated_at: embedding ? new Date().toISOString() : null, ai_difficulty: typeof aiAnalysis.difficulty === "string" ? aiAnalysis.difficulty : null,
          ai_reading_time_minutes: typeof aiAnalysis.reading_time_minutes === "number" ? aiAnalysis.reading_time_minutes : null,
          ai_confidence: typeof aiAnalysis.confidence === "number" ? Math.max(0, Math.min(1, aiAnalysis.confidence)) : null,
          moderation_flags: moderationFlags, moderation_risk_score: moderationRisk, source_consent: true,
          ai_group_type: aiGroupType, ai_file_breakdown: aiFileBreakdown, ai_group_conflicts: aiGroupConflicts, ai_raw_analysis: aiAnalysis,
          moderation_summary: moderationRationale, moderation_evidence: [...aiGroupConflicts, ...moderationFlags], moderation_model: typeof aiAnalysis.model === "string" ? aiAnalysis.model : null,
          ai_analysis_version: typeof aiAnalysis.analysis_version === "string" ? aiAnalysis.analysis_version : "seller-upload-v3.1",
          seller_edited_at: (aiTitle !== finalTitle || aiDescription !== finalDescription || aiCategory !== finalCategory || aiSemester !== data.semester || aiYear !== data.year) ? new Date().toISOString() : null,
          seller_final_snapshot: { title: finalTitle, description: finalDescription, table_of_contents: tableOfContents || null, category: finalCategory, course_id: data.courseId ?? null, department_id: data.departmentId ?? null, semester: data.semester ?? null, year: data.year ?? null, tags: finalTags, topics: finalTopics, difficulty: finalDifficulty, reading_time_minutes: finalReadingTime },
          seller_final_ai_metadata: { tags: finalTags, topics: finalTopics, difficulty: finalDifficulty, reading_time_minutes: finalReadingTime },
          processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
      }
    }

    const label = files.length > 1 ? `"${data.title}" · ${files.length} files` : `"${data.title}"`;
    await admin.from("notifications").insert({
      profile_id: user.id,
      type: "upload_pending",
      title: files.length > 1 ? "Upload batch submitted for review" : "Resource submitted for review",
      body: `${label} is waiting for admin approval.`,
      link: "/notifications",
    });

    return NextResponse.json({ ids: insertedIds, uploadBatchId }, { status: 201 });
  } catch (error) {
    if (insertedIds.length) {
      await admin.from("files").delete().in("id", insertedIds);
    }
    await cleanupUploaded(supabase, uploaded);
    const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
