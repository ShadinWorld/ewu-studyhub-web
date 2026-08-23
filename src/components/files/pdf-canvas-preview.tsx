"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PdfJsPage = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<unknown>; cancel?: () => void };
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
  destroy?: () => Promise<void> | void;
};

type PdfJsApi = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string; withCredentials?: boolean }) => { promise: Promise<PdfJsDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsApi;
    __studyHubPdfJsPromise?: Promise<PdfJsApi>;
  }
}

const PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function loadPdfJs(): Promise<PdfJsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("PDF preview is only available in the browser."));
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (window.__studyHubPdfJsPromise) return window.__studyHubPdfJsPromise;

  window.__studyHubPdfJsPromise = new Promise<PdfJsApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-studyhub-pdfjs="true"]');
    if (existing) {
      existing.addEventListener("load", () => window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error("PDF preview library did not initialize.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("PDF preview library could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_SRC;
    script.async = true;
    script.dataset.studyhubPdfjs = "true";
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("PDF preview library did not initialize."));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("PDF preview library could not be loaded."));
    document.head.appendChild(script);
  });

  return window.__studyHubPdfJsPromise;
}

function CanvasPage({ url, label }: { url: string; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const render = async () => {
    setState("loading");
    setError("");
    try {
      const pdfjs = await loadPdfJs();
      const loadingTask = pdfjs.getDocument({ url, withCredentials: false });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const canvas = canvasRef.current;
      const frame = frameRef.current;
      if (!canvas || !frame) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, frame.clientWidth - 16);
      const scale = Math.min(2.2, availableWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = Math.ceil(viewport.width * dpr);
      canvas.height = Math.ceil(viewport.height * dpr);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas is not supported by this browser.");
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: context, viewport }).promise;
      setState("ready");
      await pdf.destroy?.();
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Preview could not be rendered.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await render();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div ref={frameRef} className="relative flex min-h-[240px] w-full items-center justify-center overflow-auto bg-white p-2 sm:p-4">
      <canvas ref={canvasRef} className={state === "ready" ? "block max-w-full shadow-sm" : "hidden"} aria-label={label ?? "PDF preview"} />
      {state === "loading" && <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>Loading preview…</span></div>}
      {state === "error" && <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center"><p className="text-sm font-semibold">Preview could not load</p><p className="text-xs leading-5 text-muted-foreground">{error || "Please try again."}</p><Button type="button" size="sm" variant="outline" onClick={render}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>}
    </div>
  );
}


function RenderedCanvas({ canvas }: { canvas: HTMLCanvasElement }) {
  const holderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    holder.appendChild(canvas);
    return () => {
      canvas.remove();
    };
  }, [canvas]);

  return <div ref={holderRef} className="flex justify-center" />;
}

function CanvasDocument({ url }: { url: string }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [pages, setPages] = useState<Array<{ canvas: HTMLCanvasElement }>>([]);

  const render = async () => {
    setState("loading");
    setError("");
    setPages([]);
    try {
      const pdfjs = await loadPdfJs();
      const pdf = await pdfjs.getDocument({ url, withCredentials: false }).promise;
      const frame = frameRef.current;
      if (!frame) return;
      const availableWidth = Math.max(280, frame.clientWidth - 16);
      const nextPages: Array<{ canvas: HTMLCanvasElement }> = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2.2, availableWidth / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width * dpr);
        canvas.height = Math.ceil(viewport.height * dpr);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas is not supported by this browser.");
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: context, viewport }).promise;
        nextPages.push({ canvas });
      }

      if (!nextPages.length) throw new Error("Preview contains no readable pages.");
      setPages(nextPages);
      setState("ready");
      await pdf.destroy?.();
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Preview could not be rendered.");
    }
  };

  useEffect(() => {
    void render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div ref={frameRef} className="relative min-h-[240px] w-full bg-white p-2 sm:p-4">
      {state === "ready" && <div className="space-y-4">{pages.map((page, index) => <div key={index} className="overflow-auto rounded-xl border bg-white shadow-sm"><div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">Preview page {index + 1}</div><div className="p-2 sm:p-4"><RenderedCanvas canvas={page.canvas} /></div></div>)}</div>}
      {state === "loading" && <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>Loading preview…</span></div>}
      {state === "error" && <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center mx-auto"><p className="text-sm font-semibold">Preview could not load</p><p className="text-xs leading-5 text-muted-foreground">{error || "Please try again."}</p><Button type="button" size="sm" variant="outline" onClick={render}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button></div>}
    </div>
  );
}

export function PdfCanvasPreview({ urls, className = "", allPages = false }: { urls: string[]; className?: string; allPages?: boolean }) {
  if (!urls.length) return null;
  if (allPages) return <div className={`overflow-hidden rounded-xl ${className}`}><CanvasDocument url={urls[0]} /></div>;

  return (
    <div className={`space-y-4 ${className}`}>
      {urls.map((url, index) => (
        <article key={`${url}-${index}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {urls.length > 1 && <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">Page {index + 1}</div>}
          <CanvasPage url={url} label={`Preview page ${index + 1}`} />
        </article>
      ))}
    </div>
  );
}
