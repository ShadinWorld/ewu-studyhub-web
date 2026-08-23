"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BATCH_FILES, MAX_UPLOAD_FILE_SIZE_MB } from "@/lib/constants";

type GuideSection = {
  id: string;
  slug: string;
  section_group: "general" | "student" | "seller" | "admin";
  title: string;
  summary: string;
  what_is: string;
  how_to: string | null;
  benefits: string | null;
  notes: string | null;
  action_label: string | null;
  action_href: string | null;
  required_access: "none" | "verified_student" | "seller" | "admin";
  locked_message: string | null;
  locked_action_label: string | null;
  locked_action_href: string | null;
  sort_order: number;
  updated_at: string;
};

type GuidePayload = {
  role: "student" | "seller" | "admin";
  isSeller: boolean;
  verifiedStudent: boolean;
  sections: GuideSection[];
};

function hydrateText(value: string | null) {
  if (!value) return value;
  return value.replaceAll("{{MAX_UPLOAD_BATCH_FILES}}", String(MAX_UPLOAD_BATCH_FILES)).replaceAll("{{MAX_UPLOAD_FILE_SIZE_MB}}", String(MAX_UPLOAD_FILE_SIZE_MB));
}

const groupLabels: Record<GuideSection["section_group"], string> = {
  general: "General",
  student: "Student features",
  seller: "Seller features",
  admin: "Admin operations",
};

function allowed(section: GuideSection, payload: GuidePayload) {
  if (section.required_access === "none") return true;
  if (section.required_access === "admin") return payload.role === "admin";
  if (section.required_access === "seller") return payload.isSeller || payload.role === "admin";
  return payload.verifiedStudent || payload.role === "admin";
}

export function UserGuideButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<GuidePayload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lockedSection, setLockedSection] = useState<GuideSection | null>(null);

  async function openGuide() {
    setOpen(true);
    if (payload || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/guide", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load guide.");
      setPayload(json as GuidePayload);
      const first = json.sections?.[0];
      if (first) setExpanded({ [first.id]: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load guide.");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!payload) return [];
    if (!q) return payload.sections;
    return payload.sections.filter((section) => [section.title, hydrateText(section.summary), hydrateText(section.what_is), hydrateText(section.how_to), hydrateText(section.benefits), hydrateText(section.notes)].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [payload, query]);

  const groups = useMemo(() => {
    const map = new Map<string, GuideSection[]>();
    for (const section of filtered) {
      const list = map.get(section.section_group) ?? [];
      list.push(section);
      map.set(section.section_group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <>
      <Button type="button" size="lg" variant="outline" onClick={openGuide} className={`gap-2 ${className}`} aria-label="Open User Guide">
        <BookOpen className="h-5 w-5" />
        User Guide
      </Button>

      {open && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="EWU StudyHub User Guide" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                <div className="min-w-0"><h2 className="text-lg font-bold sm:text-xl">EWU StudyHub User Guide</h2><p className="text-xs text-muted-foreground">শুধু প্রয়োজনীয় section expand করুন, benefit বুঝুন এবং দরকার হলে সরাসরি action নিন.</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-accent" aria-label="Close User Guide"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-4xl space-y-5">
                <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guide-এর মধ্যে Search করুন…" className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" /></div>
                {loading && <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Guide load হচ্ছে…</div>}
                {error && !loading && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">{error}</div>}
                {!loading && !error && groups.map(([group, sections]) => (
                  <section key={group} className="space-y-2">
                    <div className="px-1"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{groupLabels[group as GuideSection["section_group"]]}</p></div>
                    {sections.map((section) => {
                      const isOpen = Boolean(expanded[section.id]);
                      const canAct = allowed(section, payload!);
                      return (
                        <article key={section.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                          <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))} className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-accent/40 sm:px-5">
                            <span className="min-w-0"><span className="block font-semibold">{section.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{hydrateText(section.summary)}</span></span>
                            <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </button>
                          {isOpen && (
                            <div className="space-y-5 border-t px-4 py-5 text-sm leading-6 sm:px-5">
                              <div><h3 className="font-semibold text-foreground">এটা কী?</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.what_is)}</p></div>
                              {section.how_to && <div><h3 className="font-semibold text-foreground">কীভাবে ব্যবহার করবেন?</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.how_to)}</p></div>}
                              {section.benefits && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="font-semibold text-foreground">আপনি কী benefit পাবেন?</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.benefits)}</p></div>}
                              {section.notes && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><h3 className="font-semibold text-foreground">কী খেয়াল রাখবেন?</h3><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.notes)}</p></div>}
                              {section.action_href && section.action_label && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {canAct ? (
                                    <Button asChild><a href={section.action_href}><ExternalLink className="mr-2 h-4 w-4" />{section.action_label}</a></Button>
                                  ) : (
                                    <Button type="button" variant="outline" onClick={() => setLockedSection(section)}>{section.action_label}</Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {!sections.length && <div className="rounded-xl border p-4 text-sm text-muted-foreground">এই section-এ কোনো matching guide পাওয়া যায়নি.</div>}
                  </section>
                ))}
                {!loading && !error && !filtered.length && <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">কোনো matching guide section পাওয়া যায়নি। অন্য keyword দিয়ে Search করুন.</div>}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-6"><p className="text-xs text-muted-foreground">Guide content Admin Panel থেকে manage করা যায়।</p><Button type="button" onClick={() => setOpen(false)}>Close</Button></footer>

            {lockedSection && (
              <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setLockedSection(null)}>
                <div className="w-full max-w-md rounded-3xl border bg-background p-6 shadow-2xl">
                  <h3 className="text-lg font-bold">এই action এখনো available নয়</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{lockedSection.locked_message || "এই feature ব্যবহার করার আগে আপনার account-এর কিছু requirement পূরণ করতে হবে."}</p>
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setLockedSection(null)}>পরে করব</Button>
                    {lockedSection.locked_action_href && <Button asChild><a href={lockedSection.locked_action_href}>{lockedSection.locked_action_label || "Continue"}</a></Button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
