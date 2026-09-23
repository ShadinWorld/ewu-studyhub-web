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

export function loadPdfJs(): Promise<PdfJsApi> {
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
    // Re-rendering on URL change is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div ref={frameRef} className="relative flex min-h-[240px] w-full items-center justify-center overflow-auto bg-white p-2 sm:p-4">
      <canvas ref={canvasRef} className={state === "ready" ? "block max-w-full shadow-sm" : "hidden"} aria-label={label ?? "PDF preview"} />
      {state === "loading" && (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading preview…</span>
        </div>
      )}
      {state === "error" && (
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-semibold">Preview could not load</p>
          <p className="text-xs leading-5 text-muted-foreground">{error || "Please try again."}</p>
          <Button type="button" size="sm" variant="outline" onClick={render}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export function PdfCanvasPreview({ urls, className = "", allPages = false, maxPages }: {
  urls: string[];
  className?: string;
  allPages?: boolean;
  maxPages?: number;
}) {
  if (!urls.length) return null;
  const displayUrls = allPages && maxPages ? urls.slice(0, Math.max(1, maxPages)) : urls;

  return (
    <div className={`space-y-4 ${className}`}>
      {displayUrls.map((url, index) => (
        <article key={`${url}-${index}`} className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {displayUrls.length > 1 && <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">Page {index + 1}</div>}
          <CanvasPage url={url} label={`Preview page ${index + 1}`} />
        </article>
      ))}
    </div>
  );
}


export function PdfDocumentPreview({ url, maxPages = 3, className = "" }: { url: string; maxPages?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = useState<PdfJsDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let documentRef: PdfJsDocument | null = null;
    setState("loading");
    setError("");
    setPdf(null);
    setTotalPages(0);
    setPageNumber(1);
    void loadPdfJs()
      .then((pdfjs) => pdfjs.getDocument({ url, withCredentials: false }).promise)
      .then((document) => {
        if (cancelled) { void document.destroy?.(); return; }
        documentRef = document;
        setPdf(document);
        setTotalPages(document.numPages);
        setState("loading");
      })
      .catch((cause) => {
        if (cancelled) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "PDF preview could not be opened.");
      });
    return () => {
      cancelled = true;
      void documentRef?.destroy?.();
    };
  }, [url]);

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    const renderPage = async () => {
      setState("loading");
      setError("");
      try {
        const page = await pdf.getPage(Math.min(pageNumber, Math.max(1, Math.min(pdf.numPages, maxPages))));
        const canvas = canvasRef.current;
        const frame = frameRef.current;
        if (!canvas || !frame || cancelled) return;
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
        if (!cancelled) setState("ready");
      } catch (cause) {
        if (cancelled) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "This PDF page could not be rendered.");
      }
    };
    void renderPage();
    return () => { cancelled = true; };
  }, [pdf, pageNumber, maxPages]);

  const visiblePages = Math.min(totalPages || 1, Math.max(1, maxPages));
  const canPrev = pageNumber > 1;
  const canNext = pageNumber < visiblePages;

  return (
    <div className={`overflow-hidden rounded-2xl border bg-background ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="text-xs font-semibold text-muted-foreground">PDF Preview · Page {Math.min(pageNumber, visiblePages)} of {visiblePages}</div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={!canPrev || state === "loading"} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>Previous</Button>
          <Button type="button" size="sm" variant="outline" disabled={!canNext || state === "loading"} onClick={() => setPageNumber((value) => Math.min(visiblePages, value + 1))}>Next</Button>
        </div>
      </div>
      <div ref={frameRef} className="relative flex min-h-[52vh] w-full items-center justify-center overflow-auto bg-white p-2 sm:p-4">
        {state === "loading" && <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>PDF page load হচ্ছে…</span></div>}
        {state === "error" && <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-12 text-center"><p className="text-sm font-semibold">PDF preview open করা যাচ্ছে না</p><p className="text-xs leading-5 text-muted-foreground">{error || "Please try another PDF file."}</p><Button type="button" size="sm" variant="outline" onClick={() => setPageNumber((value) => value)}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>}
        <canvas ref={canvasRef} className={state === "ready" ? "block max-w-full shadow-sm" : "hidden"} aria-label={`PDF page ${pageNumber} preview`} />
      </div>
      {totalPages > visiblePages && <p className="border-t bg-muted/20 px-3 py-2 text-center text-[11px] leading-5 text-muted-foreground">Seller verification preview প্রথম {visiblePages} page পর্যন্ত দেখাচ্ছে। Original file upload ও review-এর workflow অপরিবর্তিত থাকবে.</p>}
    </div>
  );
}
