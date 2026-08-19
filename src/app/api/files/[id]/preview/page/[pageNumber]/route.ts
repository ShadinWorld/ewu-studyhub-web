import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: { id: string; pageNumber: string } }) {
  const supabase = createClient();
  const pageNumber = Number.parseInt(params.pageNumber, 10);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return NextResponse.json({ error: "Invalid preview page." }, { status: 400 });
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, title, storage_path, file_kind, pricing_type, visibility, page_count")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (file.file_kind !== "pdf") {
    return NextResponse.json({ error: "Preview page is available for PDF resources only." }, { status: 400 });
  }

  const totalPages = Number(file.page_count ?? 0);
  const previewPages = Math.max(1, Math.ceil(totalPages * 0.3));
  if (pageNumber > previewPages || pageNumber > totalPages) {
    return NextResponse.json({ error: "This preview page is locked." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: source, error: sourceError } = await admin.storage
    .from("files-private")
    .download(file.storage_path);

  if (sourceError || !source) {
    return NextResponse.json({ error: "Could not open this resource preview." }, { status: 500 });
  }

  try {
    const sourceBytes = new Uint8Array(await source.arrayBuffer());
    const sourcePdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const index = pageNumber - 1;
    if (index >= sourcePdf.getPageCount()) {
      return NextResponse.json({ error: "Preview page not found." }, { status: 404 });
    }

    const pagePdf = await PDFDocument.create();
    const [page] = await pagePdf.copyPages(sourcePdf, [index]);
    pagePdf.addPage(page);
    const bytes = await pagePdf.save();
    const responseBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBody).set(bytes);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="preview-page-${pageNumber}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "This PDF page could not be rendered." }, { status: 500 });
  }
}
