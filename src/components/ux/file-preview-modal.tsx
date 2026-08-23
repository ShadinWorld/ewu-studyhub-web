"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Loader2, Presentation, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewOfficeFile, type OfficePreviewResult } from "@/lib/client-office-preview";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function kind(file: File) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf" as const;
  if (file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(name)) return "image" as const;
  if (name.endsWith(".docx")) return "docx" as const;
  if (name.endsWith(".pptx")) return "pptx" as const;
  if (name.endsWith(".doc")) return "doc" as const;
  if (name.endsWith(".ppt")) return "ppt" as const;
  return "office" as const;
}

export function FilePreviewModal({ file, onClose }: { file: File; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [officePreview, setOfficePreview] = useState<OfficePreviewResult | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);
  const [officeLoading, setOfficeLoading] = useState(false);
  const fileKind = useMemo(() => kind(file), [file]);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    setOfficePreview(null);
    setOfficeError(null);
    if (fileKind !== "docx" && fileKind !== "pptx") return;
    let cancelled = false;
    setOfficeLoading(true);
    previewOfficeFile(file)
      .then((result) => { if (!cancelled) setOfficePreview(result); })
      .catch((error) => { if (!cancelled) setOfficeError(error instanceof Error ? error.message : "Could not prepare this document preview."); })
      .finally(() => { if (!cancelled) setOfficeLoading(false); });
    return () => { cancelled = true; };
  }, [file, fileKind]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title = fileKind === "pdf" ? "PDF Preview" : fileKind === "image" ? "Image Preview" : fileKind === "docx" ? "DOCX Quick Preview" : fileKind === "pptx" ? "PPTX Slide Preview" : "File Preview";

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${file.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {fileKind === "image" ? <ImageIcon className="h-5 w-5" /> : fileKind === "pptx" || fileKind === "ppt" ? <Presentation className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">{title} · {formatBytes(file.size)}</p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-3 sm:p-5">
          {fileKind === "image" && url ? (
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border bg-background p-2 sm:p-4">
              <img src={url} alt={file.name} className="max-h-[72vh] max-w-full rounded-xl object-contain" />
            </div>
          ) : fileKind === "pdf" && url ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Browser PDF preview — the file is still local and has not been uploaded yet.</div>
              <iframe title={`Preview ${file.name}`} src={url} className="h-[72vh] min-h-[420px] w-full rounded-2xl border bg-white" />
            </div>
          ) : fileKind === "docx" || fileKind === "pptx" ? (
            <div className="space-y-4">
              {officeLoading ? (
                <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border bg-background p-6 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 font-semibold">Preparing Quick Preview…</p><p className="mt-1 text-sm text-muted-foreground">Only this selected local file is being read in your browser.</p></div>
              ) : officeError ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-semibold">Quick Preview could not be prepared</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{officeError}</p></div></div></div>
              ) : officePreview ? (
                <>
                  {officePreview.warnings.map((warning) => <div key={warning} className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />{warning}</div>)}
                  {officePreview.kind === "docx" ? (
                    <article className="mx-auto max-w-3xl rounded-2xl border bg-background p-6 shadow-sm sm:p-9">
                      <div className="mb-6 border-b pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">DOCX Quick Preview</p><p className="mt-1 text-sm text-muted-foreground">Content verification view — formatting may differ from Microsoft Word.</p></div>
                      <div className="space-y-4 text-sm leading-7 text-foreground">{officePreview.blocks.length ? officePreview.blocks.map((block, index) => <p key={`${index}-${block.text.slice(0, 20)}`} className="whitespace-pre-wrap">{block.text}</p>) : <p className="text-muted-foreground">No readable text was found in this document.</p>}</div>
                    </article>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">{officePreview.blocks.map((block, index) => <article key={index} className="min-h-[220px] rounded-2xl border bg-background p-5 shadow-sm"><div className="flex items-center justify-between gap-3 border-b pb-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Slide {index + 1}</p><span className="text-[11px] text-muted-foreground">Quick Preview</span></div><p className="mt-5 whitespace-pre-wrap text-sm leading-7">{block.text.replace(/^Slide \d+\n/, "")}</p></article>)}</div>
                  )}
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border bg-background px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText className="h-8 w-8" /></div>
              <p className="mt-5 text-base font-semibold">Quick Preview is limited for this file format</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Legacy .doc/.ppt files use an older binary format that modern browsers cannot safely render locally. For the best upload verification experience, save the file as <strong>.docx</strong> or <strong>.pptx</strong> and preview it here before submitting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
