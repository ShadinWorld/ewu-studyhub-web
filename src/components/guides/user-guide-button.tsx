"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, CheckCircle2, ChevronDown, ExternalLink, Info, Loader2, Search, ShieldCheck, Store, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BATCH_FILES, MAX_UPLOAD_FILE_SIZE_MB } from "@/lib/constants";

type AccessRequirement = "none" | "authenticated_student" | "verified_student" | "seller" | "admin";
type GuideGroup = "general" | "student" | "seller" | "admin";
type OverviewKind = "intro" | "capability" | "workflow" | "access" | "next_step";

type GuideSection = {
  id: string;
  slug: string;
  section_group: GuideGroup;
  title: string;
  summary: string;
  what_is: string;
  how_to: string | null;
  benefits: string | null;
  notes: string | null;
  action_label: string | null;
  action_href: string | null;
  required_access: AccessRequirement;
  locked_message: string | null;
  locked_action_label: string | null;
  locked_action_href: string | null;
  sort_order: number;
  updated_at: string;
};

type OverviewItem = {
  id: string;
  slug: string;
  role_scope: GuideGroup;
  kind: OverviewKind;
  title: string;
  summary: string;
  benefit: string | null;
  action_label: string | null;
  action_href: string | null;
  required_access: AccessRequirement;
  locked_message: string | null;
  locked_action_label: string | null;
  locked_action_href: string | null;
  sort_order: number;
  updated_at: string;
};

type GuidePayload = {
  isAuthenticated: boolean;
  role: "guest" | "student" | "seller" | "admin";
  isSeller: boolean;
  studentAccess: boolean;
  overview: OverviewItem[];
  sections: GuideSection[];
};

function hydrateText(value: string | null) {
  if (!value) return value;
  return value
    .replaceAll("{{MAX_UPLOAD_BATCH_FILES}}", String(MAX_UPLOAD_BATCH_FILES))
    .replaceAll("{{MAX_UPLOAD_FILE_SIZE_MB}}", String(MAX_UPLOAD_FILE_SIZE_MB));
}

const groupLabels: Record<GuideGroup, string> = {
  general: "সবার জন্য",
  student: "Student features",
  seller: "Seller features",
  admin: "Admin operations",
};

const roleMeta = {
  guest: { label: "Guest", icon: UserRound, badge: "Login ছাড়াই Guide-এর overview ও public featureগুলো বুঝতে পারবেন" },
  student: { label: "Student", icon: UserRound, badge: "Login করা থাকলে Student-level Guide actions available থাকবে" },
  seller: { label: "Seller", icon: Store, badge: "আপনি Student features-এর সাথে Seller features-ও ব্যবহার করতে পারবেন" },
  admin: { label: "Admin", icon: ShieldCheck, badge: "আপনি platform-এর Admin operations দেখতে পারবেন" },
} as const;

function allowed(requirement: AccessRequirement, payload: GuidePayload) {
  if (requirement === "none") return true;
  if (requirement === "admin") return payload.role === "admin";
  if (requirement === "seller") return payload.isSeller || payload.role === "admin";
  if (requirement === "authenticated_student") return payload.studentAccess;
  return payload.studentAccess;
}

function lockedForAuth(requirement: AccessRequirement, payload: GuidePayload) {
  if (payload.isAuthenticated) return false;
  return requirement !== "none";
}

function roleVisible(item: OverviewItem, payload: GuidePayload) {
  if (payload.role === "admin") return true;
  if (item.role_scope === "admin") return false;
  return true;
}

export function UserGuideButton({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<GuidePayload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lockedItem, setLockedItem] = useState<OverviewItem | GuideSection | null>(null);
  const [mounted, setMounted] = useState(false);

  async function openGuide() {
    setOpen(true);
    if (payload || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/guide", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load guide.");
      const next = json as GuidePayload;
      setPayload(next);
      const firstSection = next.sections?.[0];
      if (firstSection) setExpanded({ [firstSection.id]: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load guide.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredSections = useMemo(() => {
    if (!payload) return [];
    const q = query.trim().toLowerCase();
    if (!q) return payload.sections;
    return payload.sections.filter((section) => [section.title, section.summary, section.what_is, section.how_to, section.benefits, section.notes].filter(Boolean).map((v) => hydrateText(v) ?? "").join(" ").toLowerCase().includes(q));
  }, [payload, query]);

  const filteredOverview = useMemo(() => {
    if (!payload) return [];
    const q = query.trim().toLowerCase();
    return payload.overview.filter((item) => roleVisible(item, payload)).filter((item) => !q || [item.title, item.summary, item.benefit].filter(Boolean).map((v) => hydrateText(v) ?? "").join(" ").toLowerCase().includes(q));
  }, [payload, query]);

  const sectionGroups = useMemo(() => {
    const map = new Map<GuideGroup, GuideSection[]>();
    for (const section of filteredSections) {
      const list = map.get(section.section_group) ?? [];
      list.push(section);
      map.set(section.section_group, list);
    }
    return Array.from(map.entries());
  }, [filteredSections]);

  const groupedOverview = useMemo(() => {
    const capabilities = filteredOverview.filter((item) => item.kind === "capability" || item.kind === "next_step" || item.kind === "access");
    const workflows = filteredOverview.filter((item) => item.kind === "workflow");
    const intro = filteredOverview.filter((item) => item.kind === "intro");
    return { intro, capabilities, workflows };
  }, [filteredOverview]);

  const role = payload ? roleMeta[payload.role] : roleMeta.guest;
  const RoleIcon = role.icon;

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "lg"}
        variant="outline"
        onClick={openGuide}
        className={`${compact ? "h-9 shrink-0 rounded-xl border-primary/30 bg-primary/[0.06] px-2.5 font-semibold text-primary hover:bg-primary/[0.12] sm:h-10 sm:px-3" : ""} gap-2 ${className}`}
        aria-label="Open User Guide"
        title="EWU StudyHub User Guide"
      >
        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>{compact ? <><span className="sm:hidden">Guide</span><span className="hidden sm:inline">User Guide</span></> : "User Guide"}</span>
      </Button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="EWU StudyHub User Guide" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                <div className="min-w-0"><h2 className="text-lg font-bold sm:text-xl">EWU StudyHub User Guide</h2><p className="text-xs text-muted-foreground">আগে পুরো system-এর overview দেখুন, তারপর দরকারি section খুলুন।</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-accent" aria-label="Close User Guide"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-5xl space-y-5">
                {loading && <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Guide load হচ্ছে…</div>}
                {error && !loading && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">{error}</div>}

                {!loading && !error && payload && (
                  <>
                    <section className="rounded-3xl border border-primary/20 bg-primary/[0.035] p-4 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><RoleIcon className="h-5 w-5 text-primary" /><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Your access</p></div>
                          <h3 className="mt-1 text-xl font-bold">আপনার account অনুযায়ী আপনি কী কী করতে পারবেন?</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{role.badge}। নিচের overview-তে available ও locked feature আলাদা করে দেখা যাবে।</p>
                        </div>
                        <div className="rounded-2xl border bg-background px-4 py-3 text-sm shadow-sm"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-500" />আপনার access</div><p className="mt-1 text-xs leading-5 text-muted-foreground">কোনো feature locked থাকলে কারণ ও পরের প্রয়োজনীয় action এখানেই দেখাবে।</p></div>
                      </div>
                    </section>

                    {groupedOverview.intro.length > 0 && <section className="rounded-3xl border bg-card p-4 sm:p-6"><div className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /><h3 className="text-xl font-bold">A–Z Quick Overview</h3></div><div className="mt-4 space-y-4">{groupedOverview.intro.map((item) => <div key={item.id} className="rounded-2xl border bg-muted/10 p-4"><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{hydrateText(item.summary)}</p>{item.benefit && <p className="mt-3 rounded-xl bg-emerald-500/5 px-3 py-2 text-sm leading-6"><span className="font-semibold">আপনার সুবিধা:</span> {hydrateText(item.benefit)}</p>}</div>)}</div></section>}

                    {groupedOverview.capabilities.length > 0 && <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h3 className="text-xl font-bold">আপনার জন্য available features</h3><p className="text-sm text-muted-foreground">প্রতিটি item-এর এক লাইনের summary আছে; বিস্তারিত দরকার হলে নিচের full section ব্যবহার করুন।</p></div></div><div className="grid gap-3 md:grid-cols-2">{groupedOverview.capabilities.map((item) => {
                      const canAct = allowed(item.required_access, payload);
                      return <article key={item.id} className={`rounded-2xl border p-4 ${canAct ? "bg-card" : "bg-muted/20"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{hydrateText(item.summary)}</p></div>{!canAct && <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700">Locked</span>}</div>{item.benefit && <p className="mt-3 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Benefit:</span> {hydrateText(item.benefit)}</p>}{item.action_href && item.action_label && <div className="mt-4">{canAct ? <Button asChild size="sm"><a href={item.action_href}><ExternalLink className="mr-2 h-4 w-4" />{item.action_label}</a></Button> : <Button type="button" size="sm" variant="outline" onClick={() => setLockedItem(item)}>{lockedForAuth(item.required_access, payload) ? "Login করে ব্যবহার করুন" : item.action_label}</Button>}</div>}</article>;
                    })}</div></section>}

                    {groupedOverview.workflows.length > 0 && <section className="rounded-3xl border bg-card p-4 sm:p-6"><div className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /><h3 className="text-xl font-bold">মূল workflow এক নজরে</h3></div><div className="mt-4 grid gap-3 md:grid-cols-3">{groupedOverview.workflows.map((item) => <article key={item.id} className="rounded-2xl border p-4"><p className="font-semibold">{item.title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{hydrateText(item.summary)}</p></article>)}</div></section>}

                    <section className="sticky top-0 z-10 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur">
                      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guide-এর মধ্যে Search করুন…" className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" /></div>
                    </section>

                    <section className="space-y-4">
                      <div><h3 className="text-xl font-bold">বিস্তারিত Guide</h3><p className="text-sm text-muted-foreground">যেটা দরকার শুধু সেটাই খুলুন। Overview-তে যা জেনে গেছেন, নিচে তার পুনরাবৃত্তি না করে প্রয়োজনীয় detail দেওয়া আছে।</p></div>
                      {sectionGroups.map(([group, sections]) => <div key={group} className="space-y-2"><p className="px-1 text-xs font-bold uppercase tracking-wide text-primary">{groupLabels[group]}</p>{sections.map((section) => {
                        const isOpen = Boolean(expanded[section.id]);
                        const canAct = allowed(section.required_access, payload);
                        return <article key={section.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm"><button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))} className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-accent/40 sm:px-5"><span className="min-w-0"><span className="block font-semibold">{section.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{hydrateText(section.summary)}</span></span><ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen && <div className="border-t px-4 py-5 sm:px-5"><div className="space-y-4 text-sm leading-6"><div><h4 className="font-semibold">মূল কথা</h4><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.what_is)}</p></div>{section.how_to && <div><h4 className="font-semibold">কীভাবে ব্যবহার করবেন</h4><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.how_to)}</p></div>}{section.benefits && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3"><p className="font-semibold">আপনার সুবিধা</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.benefits)}</p></div>}{section.notes && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="font-semibold">মনে রাখবেন</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{hydrateText(section.notes)}</p></div>}{section.action_href && section.action_label && <div className="flex flex-wrap gap-2 pt-1">{canAct ? <Button asChild size="sm"><a href={section.action_href}><ExternalLink className="mr-2 h-4 w-4" />{section.action_label}</a></Button> : <Button type="button" size="sm" variant="outline" onClick={() => setLockedItem(section)}>{lockedForAuth(section.required_access, payload) ? "Login করে ব্যবহার করুন" : section.action_label}</Button>}</div>}</div></div>}</article>;
                      })}</div>)}
                    </section>
                  </>
                )}
              </div>
            </div>

            {mounted && lockedItem && createPortal(
              <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setLockedItem(null)}>
                <div className="w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl">
                  <h3 className="text-lg font-bold">এই action এখনো available নয়</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{!payload?.isAuthenticated ? "এই action ব্যবহার করতে আগে Login করতে হবে। Login করার পর আপনার account Student হিসেবে কাজ করবে; আলাদা Student verification দিয়ে Guide access নেওয়ার প্রয়োজন নেই." : lockedItem.locked_message || "এই feature ব্যবহার করার আগে প্রয়োজনীয় eligibility সম্পূর্ণ করতে হবে."}</p>
                  <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setLockedItem(null)}>বন্ধ করুন</Button>{!payload?.isAuthenticated ? <Button asChild><a href="/login">Login করুন</a></Button> : lockedItem.locked_action_href && lockedItem.locked_action_label && <Button asChild><a href={lockedItem.locked_action_href}>{lockedItem.locked_action_label}</a></Button>}</div>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
