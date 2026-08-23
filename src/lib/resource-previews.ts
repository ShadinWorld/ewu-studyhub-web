import { PDFDocument } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/server";

const PREVIEW_RATIO = 0.3;

export function getPreviewPageCount(totalPages: number | null | undefined) {
  if (!totalPages || totalPages <= 0) return 0;
  return Math.min(totalPages, Math.max(1, Math.ceil(totalPages * PREVIEW_RATIO)));
}

function previewPathFor(storagePath: string) {
  return `${storagePath}.preview.pdf`;
}

async function uploadOrReusePreview(path: string, bytes: Uint8Array, contentType = "application/pdf") {
  const admin = createAdminClient();
  const { error } = await admin.storage.from("files-preview").upload(path, bytes, { contentType, upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return path;
}

export async function ensurePdfPreview({
  fileId,
  storagePath,
  previewStoragePath,
  pageCount,
}: {
  fileId: string;
  storagePath: string;
  previewStoragePath: string | null;
  pageCount: number | null;
}) {
  const admin = createAdminClient();

  if (previewStoragePath) {
    const { data, error } = await admin.storage.from("files-preview").download(previewStoragePath);
    if (!error && data) return previewStoragePath;
  }

  const { data: original, error: sourceError } = await admin.storage.from("files-private").download(storagePath);
  if (sourceError || !original) throw new Error("Could not prepare the PDF preview source.");

  const sourceBytes = new Uint8Array(await original.arrayBuffer());
  const sourcePdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const totalPages = Math.min(sourcePdf.getPageCount(), pageCount ?? sourcePdf.getPageCount());
  const previewPages = getPreviewPageCount(totalPages);
  if (!previewPages) throw new Error("This PDF does not contain a readable page.");

  const previewDoc = await PDFDocument.create();
  const copiedPages = await previewDoc.copyPages(sourcePdf, Array.from({ length: previewPages }, (_, index) => index));
  copiedPages.forEach((page) => previewDoc.addPage(page));
  const previewBytes = await previewDoc.save();
  const path = previewPathFor(storagePath);
  await uploadOrReusePreview(path, previewBytes);

  await admin.from("files").update({ preview_storage_path: path }).eq("id", fileId);
  return path;
}

export async function ensureImagePreview({
  fileId,
  storagePath,
  previewStoragePath,
}: {
  fileId: string;
  storagePath: string;
  previewStoragePath: string | null;
}) {
  const admin = createAdminClient();

  if (previewStoragePath) {
    const { data, error } = await admin.storage.from("files-preview").download(previewStoragePath);
    if (!error && data) {
      const type = data.type?.toLowerCase() ?? "";
      if (type === "application/pdf" || /\.pdf$/i.test(previewStoragePath)) return previewStoragePath;

      // Legacy preview images are converted once into a small PDF artifact so
      // the browser never needs the original image and no repeated conversion
      // is performed on every preview request.
      const bytes = new Uint8Array(await data.arrayBuffer());
      const output = await PDFDocument.create();
      const extension = previewStoragePath.split(".").pop()?.toLowerCase();
      const image = type.includes("png") || extension === "png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
      const previewHeight = Math.max(1, Math.round(image.height * PREVIEW_RATIO));
      const page = output.addPage([image.width, previewHeight]);
      page.drawImage(image, { x: 0, y: -(image.height - previewHeight), width: image.width, height: image.height });
      const pdfBytes = await output.save();
      const path = previewPathFor(storagePath);
      await uploadOrReusePreview(path, pdfBytes);
      await admin.from("files").update({ preview_storage_path: path }).eq("id", fileId);
      return path;
    }
  }

  const { data: original, error: sourceError } = await admin.storage.from("files-private").download(storagePath);
  if (sourceError || !original) throw new Error("Could not prepare the image preview source.");

  const bytes = new Uint8Array(await original.arrayBuffer());
  const contentType = original.type?.toLowerCase() ?? "";
  const extension = storagePath.split(".").pop()?.toLowerCase();
  const output = await PDFDocument.create();
  const image = contentType.includes("png") || extension === "png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
  const previewHeight = Math.max(1, Math.round(image.height * PREVIEW_RATIO));
  const page = output.addPage([image.width, previewHeight]);
  page.drawImage(image, { x: 0, y: -(image.height - previewHeight), width: image.width, height: image.height });
  const pdfBytes = await output.save();
  const path = previewPathFor(storagePath);
  await uploadOrReusePreview(path, pdfBytes);
  await admin.from("files").update({ preview_storage_path: path }).eq("id", fileId);
  return path;
}
