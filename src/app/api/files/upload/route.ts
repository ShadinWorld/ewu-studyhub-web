import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { uploadFileSchema } from "@/lib/validations";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/zip",
  "application/x-zip-compressed",
  "image/png",
  "image/jpeg",
]);

function mimeToKind(mime: string) {
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("presentation")) return "ppt";
  if (mime.includes("word")) return "docx";
  if (mime.includes("zip")) return "zip";
  if (mime.startsWith("image/")) return "image";
  return "other";
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to upload." }, { status: 401 });
  }

  // ---- Seller gate: only verified sellers may upload, not just any account ----
  const { data: profile } = await supabase
    .from("profiles")
    .select("university_id, is_seller, role")
    .eq("id", user.id)
    .single();

  // Seller gate:
  // Admin-approved sellers (is_seller=true or role=seller) may upload directly.
  // We intentionally do NOT require university_email/student-ID verification here;
  // an admin can manually grant seller status.
  if (!profile?.is_seller && profile?.role !== "seller") {
    return NextResponse.json(
      { error: "You need to become a seller before uploading. Go to Dashboard → Become a Seller." },
      { status: 403 }
    );
  }

  // ---- Basic rate limiting: max 10 uploads per rolling hour per user ----
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("files")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Upload limit reached. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 100MB limit." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

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
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  if (data.pricingType === "paid" && data.priceCents < 1000) {
    return NextResponse.json({ error: "Paid resources must be priced at least ৳10." }, { status: 400 });
  }

  // ---- Duplicate detection: sha256 hash of file bytes ----
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(bytes).digest("hex");

  const { data: dup } = await supabase
    .from("files")
    .select("id, title")
    .eq("file_hash", fileHash)
    .neq("visibility", "rejected")
    .limit(1)
    .maybeSingle();
  if (dup) {
    return NextResponse.json(
      { error: `This file appears to already exist on the platform ("${dup.title}").` },
      { status: 409 }
    );
  }

  // ---- Upload original to private bucket ----
  const ext = file.name.split(".").pop();
  const storagePath = `${user.id}/${fileHash}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("files-private")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: "Failed to store file. Please try again." }, { status: 500 });
  }

  // ---- PDF/image preview + thumbnail ----
  // PDFs get a real public preview PDF (all pages for free resources, a safe
  // sample for paid resources). Free images are copied to the public preview
  // bucket so their real image can be used as the thumbnail and preview.
  let pageCount: number | null = null;
  let previewStoragePath: string | null = null;
  let thumbnailUrl: string | null = null;

  if (mimeToKind(file.type) === "pdf") {
    try {
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();

      if (pageCount > 0) {
        const previewPageCount = data.pricingType === "free"
          ? pageCount
          : Math.max(1, Math.min(pageCount - 1, Math.ceil(pageCount * 0.2)));

        const previewDoc = await PDFDocument.create();
        const copiedPages = await previewDoc.copyPages(
          pdfDoc,
          Array.from({ length: previewPageCount }, (_, i) => i)
        );
        copiedPages.forEach((p) => previewDoc.addPage(p));
        const previewBytes = await previewDoc.save();

        previewStoragePath = `${user.id}/${fileHash}-preview.pdf`;
        const { error: previewUploadError } = await supabase.storage
          .from("files-preview")
          .upload(previewStoragePath, previewBytes, { contentType: "application/pdf", upsert: false });

        if (!previewUploadError) {
          thumbnailUrl = supabase.storage.from("files-preview").getPublicUrl(previewStoragePath).data.publicUrl;
        }
      }
    } catch {
      // Corrupt/unreadable PDF: keep the original upload, but skip preview data.
    }
  } else if (mimeToKind(file.type) === "image" && data.pricingType === "free") {
    previewStoragePath = `${user.id}/${fileHash}-preview.${ext}`;
    const { error: imagePreviewError } = await supabase.storage
      .from("files-preview")
      .upload(previewStoragePath, bytes, { contentType: file.type, upsert: false });

    if (!imagePreviewError) {
      thumbnailUrl = supabase.storage.from("files-preview").getPublicUrl(previewStoragePath).data.publicUrl;
    }
  }

  // ---- Resolve university for the resource ----
  // Normally this already exists on the seller profile. If an admin manually
  // grants seller status to an account that has no university_id, derive it
  // from the selected EWU department so the NOT NULL files.university_id
  // constraint is still satisfied.
  let universityId = profile.university_id;

  if (!universityId && data.departmentId) {
    const { data: department } = await supabase
      .from("departments")
      .select("university_id")
      .eq("id", data.departmentId)
      .maybeSingle();

    universityId = department?.university_id ?? null;
  }

  if (!universityId && data.courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("department_id")
      .eq("id", data.courseId)
      .maybeSingle();

    if (course?.department_id) {
      const { data: department } = await supabase
        .from("departments")
        .select("university_id")
        .eq("id", course.department_id)
        .maybeSingle();

      universityId = department?.university_id ?? null;
    }
  }

  if (!universityId) {
    return NextResponse.json(
      { error: "Could not determine the university for this resource. Please select a valid department/course." },
      { status: 400 }
    );
  }

  // ---- Insert file row (visibility: draft, pending admin review before publish) ----
  const { data: inserted, error: insertError } = await supabase
    .from("files")
    .insert({
      seller_id: user.id,
      university_id: universityId,
      department_id: data.departmentId ?? null,
      course_id: data.courseId ?? null,
      title: data.title,
      description: data.description ?? null,
      category: data.category,
      file_kind: mimeToKind(file.type),
      language: data.language,
      year: data.year ?? null,
      semester: data.semester ?? null,
      pricing_type: data.pricingType,
      price_cents: data.pricingType === "paid" ? data.priceCents : 0,
      storage_path: storagePath,
      preview_storage_path: previewStoragePath,
      thumbnail_url: thumbnailUrl,
      page_count: pageCount,
      file_size_bytes: file.size,
      file_hash: fileHash,
      visibility: "draft", // admin approval flips this to 'published'
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from("files-private").remove([storagePath]);
    if (previewStoragePath) await supabase.storage.from("files-preview").remove([previewStoragePath]);
    return NextResponse.json({ error: "Failed to save resource. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
