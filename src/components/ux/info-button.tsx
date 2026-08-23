"use client";

import { useEffect, useId, useState } from "react";
import { Info, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BATCH_FILES, MAX_UPLOAD_FILE_SIZE_MB } from "@/lib/constants";

function hydrateText(value: string | null) {
  if (!value) return value;
  return value.replaceAll("{{MAX_UPLOAD_BATCH_FILES}}", String(MAX_UPLOAD_BATCH_FILES)).replaceAll("{{MAX_UPLOAD_FILE_SIZE_MB}}", String(MAX_UPLOAD_FILE_SIZE_MB));
}

type ManagedHelp = {
  title: string;
  intro: string;
  how_to: string | null;
  benefits: string | null;
  notes: string | null;
};

export function InfoButton({
  title,
  children,
  slug,
  label = "Section help",
  className = "",
  compact = false,
}: {
  title?: string;
  children?: React.ReactNode;
  slug?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [managed, setManaged] = useState<ManagedHelp | null>(null);
  const [loadError, setLoadError] = useState("");
  const titleId = useId();

  async function openHelp() {
    setOpen(true);
    if (!slug || managed || loading) return;
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/help/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load help content.");
      setManaged(json.item as ManagedHelp);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load help content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const heading = managed?.title || title || "Section help";
  const renderSection = (label: string, text: string | null, extraClass = "") => text ? (
    <section className={extraClass}>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap leading-6">{hydrateText(text)}</p>
    </section>
  ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={openHelp}
        title="এই section সম্পর্কে সাহায্য"
        className={compact
          ? `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`
          : `inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/15 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      >
        <Info className="h-4 w-4" />
        {!compact && <span>Help</span>}
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
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-background p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Info className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id={titleId} className="text-lg font-bold sm:text-xl">{heading}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">সহজ ভাষায় section-এর প্রয়োজনীয় নির্দেশনা</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="Close information">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm text-muted-foreground">
              {loading && <div className="flex items-center gap-2 rounded-2xl border bg-card p-4"><Loader2 className="h-4 w-4 animate-spin text-primary" />Help content load হচ্ছে…</div>}
              {loadError && children && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{children}</div>}
              {!loading && managed && (
                <>
                  {renderSection("এটা কী?", managed.intro)}
                  {renderSection("কীভাবে ব্যবহার করবেন?", managed.how_to)}
                  {renderSection("আপনি কী benefit পাবেন?", managed.benefits)}
                  {renderSection("কী খেয়াল রাখবেন?", managed.notes)}
                </>
              )}
              {!loading && !managed && !loadError && children}
              {!loading && !managed && loadError && !children && <div className="rounded-2xl border p-4">এই section-এর Help content এখন পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।</div>}
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>বুঝেছি</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
