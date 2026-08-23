"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return "office" as const;
}

export function FilePreviewModal({ file, onClose }: { file: File; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const fileKind = useMemo(() => kind(file), [file]);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="text-xs text-muted-foreground">{file.type || "File"} · {formatBytes(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close preview">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-3 sm:p-5">
          {fileKind === "image" && url ? (
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border bg-background p-2 sm:p-4">
              {/* Local object URLs never leave the browser. */}
              <img src={url} alt={file.name} className="max-h-[72vh] max-w-full rounded-xl object-contain" />
            </div>
          ) : fileKind === "pdf" && url ? (
            <iframe title={`Preview ${file.name}`} src={url} className="h-[72vh] min-h-[420px] w-full rounded-2xl border bg-white" />
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border bg-background px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="h-8 w-8" />
              </div>
              <p className="mt-5 text-base font-semibold">This file type cannot be rendered here</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                You can still verify the filename, type and size before uploading. After upload, StudyHub will keep the original file protected according to the resource access rules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
