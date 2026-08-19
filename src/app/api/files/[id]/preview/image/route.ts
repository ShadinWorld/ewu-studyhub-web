import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * Serve a safe partial preview for paid image resources.
 *
 * Paid image originals stay in the private bucket. During upload the app
 * stores a public preview PDF containing only the top 40% of the image.
 * This endpoint crops that preview further to expose ~30% of the original
 * image while keeping the remaining 70% unavailable.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, storage_path, preview_storage_path, file_kind, pricing_type, visibility")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (file.file_kind !== "image") {
    return NextResponse.json({ error: "Image preview is available for image resources only." }, { status: 400 });
  }

  if (file.pricing_type !== "paid") {
    return NextResponse.redirect(new URL(`/files/${file.id}/viewer`, request.url));
  }

  const { data: { user } } = await supabase.auth.getUser();
  {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `/files/${params.id}`);
      return NextResponse.redirect(loginUrl);
    }

    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", file.id)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (purchase) {
      return NextResponse.redirect(new URL(`/files/${file.id}/viewer`, request.url));
    }
  }

  const admin = createAdminClient();

  try {
    // Prefer the pre-generated preview when available. This is the normal
    // path for newly uploaded paid images.
    if (file.preview_storage_path) {
      const { data: previewSource, error: previewError } = await admin.storage
        .from("files-preview")
        .download(file.preview_storage_path);

      if (previewError || !previewSource) {
        return NextResponse.json({ error: "Could not open this image preview." }, { status: 500 });
      }

      const previewBytes = new Uint8Array(await previewSource.arrayBuffer());
      const sourcePdf = await PDFDocument.load(previewBytes, { ignoreEncryption: true });
      const sourcePage = sourcePdf.getPage(0);
      const { width, height } = sourcePage.getSize();

      // Stored paid-image previews contain the top 40% of the original.
      // Cropping that preview by another 25% leaves the top 30% overall.
      const cropBottom = height * 0.25;
      const previewHeight = height - cropBottom;

      const output = await PDFDocument.create();
      const embeddedPage = await output.embedPage(sourcePage, {
        left: 0,
        bottom: cropBottom,
        right: width,
        top: height,
      });

      const page = output.addPage([width, previewHeight]);
      page.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        width,
        height: previewHeight,
      });

      const bytes = await output.save();
      const responseBody = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(responseBody).set(bytes);

      return new NextResponse(responseBody, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="image-preview-${file.id}.pdf"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    // Legacy compatibility: older paid image resources may have a null
    // preview_storage_path. In that case, read the original from the private
    // bucket and generate a safe top-30% PDF preview on demand. The original
    // image is never exposed to the browser.
    const { data: original, error: originalError } = await admin.storage
      .from("files-private")
      .download(file.storage_path ?? "");

    if (originalError || !original) {
      return NextResponse.json({ error: "Could not open this image preview." }, { status: 500 });
    }

    const originalBytes = new Uint8Array(await original.arrayBuffer());
    const contentType = original.type?.toLowerCase() ?? "";
    const storagePath = file.storage_path ?? "";
    const extension = storagePath.split(".").pop()?.toLowerCase();

    const output = await PDFDocument.create();
    const image = contentType.includes("png") || extension === "png"
      ? await output.embedPng(originalBytes)
      : await output.embedJpg(originalBytes);
    const width = image.width;
    const fullHeight = image.height;
    const previewHeight = Math.max(1, Math.round(fullHeight * 0.3));
    const page = output.addPage([width, previewHeight]);

    // Keep only the top 30% of the original image.
    page.drawImage(image, {
      x: 0,
      y: -(fullHeight - previewHeight),
      width,
      height: fullHeight,
    });

    const bytes = await output.save();
    const responseBody = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(responseBody).set(bytes);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="image-preview-${file.id}.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "This image preview could not be rendered." }, { status: 500 });
  }
}
