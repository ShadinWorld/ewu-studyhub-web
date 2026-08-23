import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensurePdfPreview } from "@/lib/resource-previews";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  void request;
  const supabase = createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, storage_path, preview_storage_path, file_kind, pricing_type, visibility, page_count")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (file.file_kind !== "pdf") {
    return NextResponse.json({ error: "PDF preview is available for PDF resources only." }, { status: 400 });
  }

  if (file.pricing_type !== "paid") {
    return NextResponse.redirect(new URL(`/files/${file.id}/viewer`, request.url));
  }

  try {
    const previewPath = await ensurePdfPreview({
      fileId: file.id,
      storagePath: file.storage_path,
      previewStoragePath: file.preview_storage_path,
      pageCount: file.page_count,
    });

    const admin = createAdminClient();
    const { data: preview, error } = await admin.storage.from("files-preview").download(previewPath);
    if (error || !preview) {
      return NextResponse.json({ error: "Could not open this resource preview." }, { status: 500 });
    }

    const bytes = await preview.arrayBuffer();
    await admin.rpc("increment_preview_request", { p_file_id: file.id });
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preview-${file.id}.pdf"`,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "This PDF preview is not available right now. Please try again later." }, { status: 503 });
  }
}
