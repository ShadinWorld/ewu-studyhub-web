"use client";

import { useEffect, useId, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InfoButton({
  title,
  children,
  label = "More information",
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(true)}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id={titleId} className="text-lg font-bold sm:text-xl">{title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">StudyHub guide</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Close information"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 text-sm leading-6 text-muted-foreground">{children}</div>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>Got it</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
