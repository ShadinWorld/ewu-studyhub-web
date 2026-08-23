export type PreviewBlock = {
  kind: "paragraph" | "slide";
  text: string;
};

export type OfficePreviewResult = {
  kind: "docx" | "pptx";
  blocks: PreviewBlock[];
  warnings: string[];
};

const MAX_PREVIEW_BYTES = 50 * 1024 * 1024;

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const min = Math.max(0, bytes.length - 22 - 0xffff);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  throw new Error("This Office file is not a valid ZIP-based document.");
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser does not support document preview. Please use a recent Chrome, Edge, Firefox or Safari browser.");

  // Copy into a concrete ArrayBuffer so TypeScript/DOM typings accept it as a BlobPart.
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(file: File) {
  if (file.size > MAX_PREVIEW_BYTES) throw new Error(`Preview is limited to ${Math.round(MAX_PREVIEW_BYTES / 1024 / 1024)}MB for Office files to protect browser memory.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(bytes);
  const entryCount = u16(view, eocd + 10);
  const centralSize = u32(view, eocd + 12);
  const centralOffset = u32(view, eocd + 16);
  const entries = new Map<string, Uint8Array>();

  if (centralOffset + centralSize > bytes.length) throw new Error("The Office file has an invalid ZIP directory.");
  let offset = centralOffset;
  const decoder = new TextDecoder("utf-8");

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || u32(view, offset) !== 0x02014b50) throw new Error("The Office file contains an invalid ZIP entry.");
    const flags = u16(view, offset + 8);
    const compression = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const uncompressedSize = u32(view, offset + 24);
    const nameLength = u16(view, offset + 28);
    const extraLength = u16(view, offset + 30);
    const commentLength = u16(view, offset + 32);
    const localHeaderOffset = u32(view, offset + 42);
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    offset = nameStart + nameLength + extraLength + commentLength;

    // Office documents are ZIP containers. Reject encrypted entries rather than trying to bypass encryption.
    if (flags & 0x1) continue;
    if (localHeaderOffset + 30 > bytes.length || u32(view, localHeaderOffset) !== 0x04034b50) continue;
    const localNameLength = u16(view, localHeaderOffset + 26);
    const localExtraLength = u16(view, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) continue;
    if (uncompressedSize > 100 * 1024 * 1024) continue;

    const compressed = bytes.subarray(dataStart, dataEnd);
    let content: Uint8Array;
    if (compression === 0) content = compressed;
    else if (compression === 8) content = await inflateRaw(compressed);
    else continue;
    entries.set(name, content);
  }

  return entries;
}

function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("This Office file contains unreadable document XML.");
  return doc;
}

function xmlText(xml: string, localName: string) {
  const doc = parseXml(xml);
  return Array.from(doc.getElementsByTagNameNS("*", localName)).map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
}

export async function previewDocx(file: File): Promise<OfficePreviewResult> {
  const entries = await readZipEntries(file);
  const documentXml = entries.get("word/document.xml");
  if (!documentXml) throw new Error("This DOCX file does not contain a readable document body.");
  const xml = new TextDecoder("utf-8").decode(documentXml);
  const doc = parseXml(xml);
  const paragraphs = Array.from(doc.getElementsByTagNameNS("*", "p"))
    .map((paragraph) => Array.from(paragraph.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join("").trim())
    .filter(Boolean)
    .slice(0, 120);
  return {
    kind: "docx",
    blocks: paragraphs.map((text) => ({ kind: "paragraph", text })),
    warnings: paragraphs.length >= 120 ? ["Showing the first 120 text paragraphs for quick verification."] : [],
  };
}

function slideNumber(name: string) {
  const match = name.match(/ppt\/slides\/slide(\d+)\.xml$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export async function previewPptx(file: File): Promise<OfficePreviewResult> {
  const entries = await readZipEntries(file);
  const slideNames = Array.from(entries.keys()).filter((name) => /ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => slideNumber(a) - slideNumber(b));
  if (!slideNames.length) throw new Error("This PPTX file does not contain readable slides.");

  const blocks = slideNames.slice(0, 50).map((name, index) => {
    const xml = new TextDecoder("utf-8").decode(entries.get(name)!);
    const text = xmlText(xml, "t");
    return { kind: "slide" as const, text: text || "(This slide has no readable text. Visual-only content may not be represented in quick preview.)" , slide: index + 1 };
  }).map(({ kind, text, slide }) => ({ kind, text: `Slide ${slide}\n${text}` }));

  return {
    kind: "pptx",
    blocks,
    warnings: slideNames.length > 50 ? ["Showing the first 50 slides for quick verification."] : ["Quick Preview verifies slide text and structure; animations, transitions and some complex PowerPoint objects may not be represented exactly."],
  };
}

export async function previewOfficeFile(file: File): Promise<OfficePreviewResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) return previewDocx(file);
  if (name.endsWith(".pptx")) return previewPptx(file);
  throw new Error("This Office format is not supported for browser-side quick preview. For legacy .doc/.ppt files, please save/export them as .docx/.pptx before uploading.");
}
