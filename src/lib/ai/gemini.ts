import { Buffer } from "node:buffer";

const API_BASE = "https://generativelanguage.googleapis.com";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
export const GEMINI_LIGHT_MODEL = process.env.GEMINI_LIGHT_MODEL || "gemini-3.5-flash-lite";
export const GEMINI_SELLER_MODEL = process.env.GEMINI_SELLER_MODEL || GEMINI_LIGHT_MODEL;

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";

export class GeminiApiError extends Error {
  status: number;
  retryable: boolean;
  retryAfterSeconds?: number;
  code?: string;

  constructor(message: string, options: { status: number; retryable: boolean; retryAfterSeconds?: number; code?: string }) {
    super(message);
    this.name = "GeminiApiError";
    this.status = options.status;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.code = options.code;
  }
}

const GEMINI_MAX_RETRIES = Math.max(0, Math.min(4, Number(process.env.GEMINI_MAX_RETRIES || 3)));
const GEMINI_RETRY_BASE_MS = Math.max(250, Number(process.env.GEMINI_RETRY_BASE_MS || 900));
const GEMINI_RETRY_MAX_MS = Math.max(GEMINI_RETRY_BASE_MS, Number(process.env.GEMINI_RETRY_MAX_MS || 8000));

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const when = Date.parse(header);
  if (!Number.isNaN(when)) return Math.max(0, Math.ceil((when - Date.now()) / 1000));
  return undefined;
}

function defaultThinkingLevelForModel(model: string): GeminiThinkingLevel | undefined {
  if (/^gemini-3\.7-/.test(model)) return "low";
  if (/^gemini-3\.6-/.test(model)) return "low";
  if (/^gemini-3\.5-flash-lite/.test(model)) return "minimal";
  if (/^gemini-3\.5-flash/.test(model)) return "low";
  return undefined;
}

function isTransientStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";

function requireApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini AI is not configured. Add GEMINI_API_KEY to the server environment.");
  return key;
}

async function geminiFetch(path: string, init: RequestInit = {}, retryLimit?: number) {
  const key = requireApiKey();
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  let lastError: GeminiApiError | null = null;

  const maxRetries = typeof retryLimit === "number" ? Math.max(0, Math.min(4, retryLimit)) : GEMINI_MAX_RETRIES;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (response.ok) return data as Record<string, unknown>;

    const errorObject = typeof data === "object" && data && "error" in data
      ? (data as { error?: { message?: string; status?: string; code?: string } }).error
      : undefined;
    const message = typeof errorObject?.message === "string"
      ? errorObject.message
      : `Gemini API error (${response.status})`;
    const retryable = isTransientStatus(response.status);
    const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
    lastError = new GeminiApiError(message, {
      status: response.status,
      retryable,
      retryAfterSeconds,
      code: errorObject?.status || errorObject?.code,
    });

    if (!retryable || attempt >= maxRetries) throw lastError;

    const exponential = Math.min(GEMINI_RETRY_MAX_MS, GEMINI_RETRY_BASE_MS * (2 ** attempt));
    const jitter = Math.floor(Math.random() * Math.min(500, Math.max(100, exponential * 0.2)));
    const waitMs = retryAfterSeconds != null
      ? Math.min(GEMINI_RETRY_MAX_MS, Math.max(250, retryAfterSeconds * 1000))
      : Math.min(GEMINI_RETRY_MAX_MS, exponential + jitter);
    await sleep(waitMs);
  }

  throw lastError || new GeminiApiError("Gemini API request failed.", { status: 500, retryable: true });
}

async function uploadFile(bytes: Buffer, mimeType: string, displayName: string, retryLimit?: number) {
  const key = requireApiKey();
  const maxRetries = typeof retryLimit === "number" ? Math.max(0, Math.min(4, retryLimit)) : GEMINI_MAX_RETRIES;
  let start: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    start = await fetch(`${API_BASE}/upload/v1beta/files?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.length),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    });
    if (start.ok) break;
    if (!isTransientStatus(start.status) || attempt >= maxRetries) break;
    const retryAfter = parseRetryAfter(start.headers.get("retry-after"));
    const waitMs = retryAfter != null ? Math.min(GEMINI_RETRY_MAX_MS, Math.max(250, retryAfter * 1000)) : Math.min(GEMINI_RETRY_MAX_MS, GEMINI_RETRY_BASE_MS * (2 ** attempt));
    await sleep(waitMs);
  }
  if (!start?.ok) throw new GeminiApiError(`Gemini file upload initialization failed (${start?.status ?? 500}).`, { status: start?.status ?? 500, retryable: isTransientStatus(start?.status ?? 500) });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return an upload URL.");

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Type": mimeType,
    },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  const resultText = await upload.text();
  if (!upload.ok) throw new Error(`Gemini file upload failed (${upload.status}).`);
  const result = JSON.parse(resultText) as { file?: { name?: string; uri?: string; mimeType?: string; state?: string } };
  const file = result.file;
  if (!file?.name || !file.uri) throw new Error("Gemini file upload returned an invalid file reference.");
  return { name: file.name, uri: file.uri, mimeType: file.mimeType || mimeType };
}

async function waitForFileActive(name: string, retryLimit?: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const data = await geminiFetch(`/v1beta/${name}`, {}, retryLimit) as { state?: string; uri?: string; mimeType?: string; error?: { message?: string } };
    if (data.state === "ACTIVE") return { uri: data.uri, mimeType: data.mimeType };
    if (data.state === "FAILED") throw new Error(data.error?.message || "Gemini could not process the uploaded document.");
    await new Promise((resolve) => setTimeout(resolve, Math.min(1200, 250 + attempt * 100)));
  }
  throw new Error("Gemini document processing timed out. Please try again.");
}

export async function generateStructured<T>({
  prompt,
  schema,
  model = GEMINI_LIGHT_MODEL,
  fileParts = [],
  temperature,
  thinkingLevel,
  maxOutputTokens,
  maxRetries,
  fastPath = false,
}: {
  prompt: string;
  schema: Record<string, unknown>;
  model?: string;
  fileParts?: Array<{ uri?: string; bytes?: Buffer; mimeType: string; name?: string }>;
  temperature?: number;
  thinkingLevel?: GeminiThinkingLevel;
  maxOutputTokens?: number;
  maxRetries?: number;
  fastPath?: boolean;
}) {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  const cleanupNames: string[] = [];
  const totalBytes = fileParts.reduce((sum, part) => sum + (part.bytes?.length || 0), 0);
  const hasPdf = fileParts.some((part) => part.mimeType.toLowerCase() === "application/pdf");
  // Google recommends inline data for small, transient real-time inputs. Keep a conservative
  // threshold to protect latency and request payload size; larger files use the File API.
  const configuredInlineMb = Number(process.env.GEMINI_SELLER_FAST_INLINE_MB || 30);
  const conservativeInlineMb = Number.isFinite(configuredInlineMb) ? Math.max(10, Math.min(80, configuredInlineMb)) : 30;
  const inlineLimitBytes = (fastPath ? (hasPdf ? conservativeInlineMb : Math.min(70, conservativeInlineMb * 2)) : (hasPdf ? 30 : 70)) * 1024 * 1024;
  const useInline = fileParts.length > 0 && fileParts.every((part) => Boolean(part.bytes) && !part.uri) && totalBytes <= inlineLimitBytes;
  try {
    if (useInline) {
      for (const part of fileParts) {
        if (!part.bytes) continue;
        parts.push({
          inline_data: {
            mime_type: part.mimeType,
            data: part.bytes.toString("base64"),
          },
        });
      }
    } else {
      // Large-file fallback: upload and poll concurrently so 2–3 file batches do not
      // pay the processing latency three times sequentially.
      const uploadedParts = await Promise.all(fileParts.map(async (part) => {
        if (part.uri) return { uri: part.uri, mimeType: part.mimeType, name: undefined as string | undefined };
        if (!part.bytes) return null;
        const uploaded = await uploadFile(part.bytes, part.mimeType, part.name || "studyhub-resource", maxRetries);
        cleanupNames.push(uploaded.name);
        return { name: uploaded.name, uri: uploaded.uri, mimeType: uploaded.mimeType };
      }));

      const activeParts = await Promise.all(uploadedParts.filter((x): x is { name: string | undefined; uri: string; mimeType: string } => Boolean(x?.uri)).map(async (part) => {
        if (!part.name) return { uri: part.uri, mimeType: part.mimeType };
        const active = await waitForFileActive(part.name, maxRetries);
        return { uri: active.uri || part.uri, mimeType: active.mimeType || part.mimeType };
      }));

      for (const part of activeParts) {
        parts.push({ file_data: { mime_type: part.mimeType, file_uri: part.uri } });
      }
    }

    const data = await geminiFetch(`/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          ...(typeof temperature === "number" ? { temperature } : {}),
          ...(thinkingLevel || defaultThinkingLevelForModel(model) ? {
            thinkingConfig: { thinkingLevel: thinkingLevel || defaultThinkingLevelForModel(model) },
          } : {}),
          ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
        },
      }),
    }, maxRetries);
    const candidate = Array.isArray(data.candidates) ? data.candidates[0] as { content?: { parts?: Array<{ text?: string }> } } : null;
    const text = candidate?.content?.parts?.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("Gemini returned an empty response.");
    return JSON.parse(text) as T;
  } finally {
    // Cleanup must never add significant latency to the seller's interactive request.
    await Promise.allSettled(cleanupNames.map((name) => geminiFetch(`/v1beta/${name}`, { method: "DELETE" }, 0)));
  }
}

export async function generateText({ prompt, model = GEMINI_LIGHT_MODEL, thinkingLevel, maxOutputTokens }: { prompt: string; model?: string; thinkingLevel?: GeminiThinkingLevel; maxOutputTokens?: number }) {
  const data = await geminiFetch(`/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        ...(thinkingLevel || defaultThinkingLevelForModel(model) ? { thinkingConfig: { thinkingLevel: thinkingLevel || defaultThinkingLevelForModel(model) } } : {}),
        ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
      },
    }),
  });
  const candidate = Array.isArray(data.candidates) ? data.candidates[0] as { content?: { parts?: Array<{ text?: string }> } } : null;
  return candidate?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
}

export async function generateImageStructured<T>({
  imageBytes,
  mimeType,
  prompt,
  schema,
  model = GEMINI_MODEL,
}: {
  imageBytes: Buffer;
  mimeType: string;
  prompt: string;
  schema: Record<string, unknown>;
  model?: string;
}) {
  const inline = imageBytes.toString("base64");
  const data = await geminiFetch(`/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: inline } }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema },
    }),
  });
  const candidate = Array.isArray(data.candidates) ? data.candidates[0] as { content?: { parts?: Array<{ text?: string }> } } : null;
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty verification response.");
  return JSON.parse(text) as T;
}


export async function embedText({
  text,
  taskType = "RETRIEVAL_DOCUMENT",
  title,
  model = GEMINI_EMBED_MODEL,
  outputDimensionality = 768,
}: {
  text: string;
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
  title?: string;
  model?: string;
  outputDimensionality?: number;
}) {
  const data = await geminiFetch(`/v1beta/models/${encodeURIComponent(model)}:embedContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      embedContentConfig: {
        taskType,
        ...(title ? { title } : {}),
        outputDimensionality,
        autoTruncate: true,
      },
    }),
  });
  const values = (data.embedding as { values?: unknown } | undefined)?.values;
  if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== "number")) {
    throw new Error("Gemini embedding response was empty or invalid.");
  }
  return values as number[];
}

export async function embedTexts({
  texts,
  taskType = "RETRIEVAL_DOCUMENT",
  titles = [],
  model = GEMINI_EMBED_MODEL,
  outputDimensionality = 768,
}: {
  texts: string[];
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
  titles?: string[];
  model?: string;
  outputDimensionality?: number;
}) {
  if (!texts.length) return [];
  const key = requireApiKey();
  const url = `${API_BASE}/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      requests: texts.map((text, index) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        embedContentConfig: {
          taskType,
          ...(titles[index] ? { title: titles[index] } : {}),
          outputDimensionality,
          autoTruncate: true,
        },
      })),
    }),
  });
  const bodyText = await response.text();
  let data: unknown = null;
  try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = { raw: bodyText }; }
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data && typeof (data as { error?: { message?: string } }).error?.message === "string"
      ? (data as { error: { message: string } }).error.message
      : `Gemini embedding batch error (${response.status})`;
    throw new Error(message);
  }
  const embeddings = Array.isArray((data as { embeddings?: unknown }).embeddings) ? (data as { embeddings: Array<{ values?: unknown }> }).embeddings : [];
  if (embeddings.length !== texts.length) throw new Error("Gemini embedding batch returned an unexpected number of results.");
  return embeddings.map((entry) => {
    const values = entry?.values;
    if (!Array.isArray(values) || values.length !== outputDimensionality || values.some((value) => typeof value !== "number")) throw new Error("Gemini embedding batch returned an invalid vector.");
    return values as number[];
  });
}
