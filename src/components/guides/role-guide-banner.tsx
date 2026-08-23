"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Info, ShieldCheck, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type GuideRole = "student" | "seller" | "admin";
type GuideSection = { title: string; paragraphs: string[] };

const GUIDE_CONTENT: Record<GuideRole, { title: string; subtitle: string; sections: GuideSection[] }> = {
  student: { title: "Student Guide", subtitle: "EWU StudyHub ব্যবহার করে resource খোঁজা, Preview, Purchase, Download, Save এবং Request করার পুরো নিয়ম এক জায়গায়।", sections: [
    { title: "01 · Getting Started", paragraphs: ["প্রথমে Account তৈরি করুন, Email verify করুন এবং Profile-এর প্রয়োজনীয় তথ্য সম্পূর্ণ রাখুন। Course ও Department ঠিকভাবে বাছাই করলে Search এবং resource discovery সহজ হয়।"] },
    { title: "02 · Resource খোঁজা", paragraphs: ["Search, Course, Department এবং Filter ব্যবহার করে resource খুঁজুন। Resource title, description, seller এবং price দেখে সিদ্ধান্ত নিন।"] },
    { title: "03 · Preview কীভাবে কাজ করে", paragraphs: ["Published resource-এ Preview available থাকলে Purchase করার আগে sample content দেখা যায়। Paid resource-এর Preview সীমিত হতে পারে; Original file protected থাকে।", "Preview verify করার পরও full file পেতে Purchase ও approval প্রয়োজন হতে পারে।"] },
    { title: "04 · Purchase", paragraphs: ["Paid resource-এর ক্ষেত্রে Seller price, Platform fee এবং Buyer pays amount দেখে Submit করুন। Payment status Pending হলে একই resource-এর জন্য বারবার payment submit করবেন না।"] },
    { title: "05 · Download", paragraphs: ["Purchase approved হলে protected Download/Viewer access পাওয়া যায়। নিজের purchased resource আপনার Purchases section থেকেও খুঁজে পাওয়া যাবে।"] },
    { title: "06 · Save ও Request", paragraphs: ["Resource পছন্দ হলে Save ব্যবহার করুন। প্রয়োজনীয় resource না পেলে Resource Request submit করতে পারেন এবং Requests/Notifications থেকে status দেখুন।"] },
    { title: "07 · Notifications", paragraphs: ["Purchase, approval, rejection, request update এবং অন্যান্য গুরুত্বপূর্ণ status Notifications-এ পাওয়া যায়।"] },
    { title: "08 · Safety & Rules", paragraphs: ["Password বা Account access অন্যের সাথে share করবেন না। Purchased resource অনুমতি ছাড়া redistribute করবেন না। Copyright বা suspicious content দেখলে Report করুন।"] },
    { title: "09 · Common Problems", paragraphs: ["Preview না খুললে page refresh করে আবার চেষ্টা করুন। Purchase status Pending থাকলে admin verification শেষ হওয়া পর্যন্ত অপেক্ষা করুন। Download সমস্যা হলে resource-এর purchase/ownership status আগে যাচাই করুন।"] },
  ]},
  seller: { title: "Seller Guide", subtitle: "Resource upload থেকে approval, sales, earnings, wallet ও payout পর্যন্ত seller workflow এক জায়গায়।", sections: [
    { title: "01 · Seller account", paragraphs: ["Seller হতে Profile ও verification requirements সম্পূর্ণ করুন। Payment settings-এ payout পাওয়ার জন্য প্রয়োজনীয় তথ্য সঠিকভাবে দিন।"] },
    { title: "02 · Upload", paragraphs: ["Upload করার আগে Course, Category, Title, Description ও pricing ঠিক করুন। এক batch-এ সর্বোচ্চ 3টি file দেওয়া যায় এবং ZIP/RAR/7Z archive গ্রহণ করা হয় না।"] },
    { title: "03 · File Preview", paragraphs: ["Select করা PDF, image, DOCX ও PPTX file upload-এর আগেই Preview করে দেখুন। ভুল বা অসম্পূর্ণ file submit করার আগে Remove করে সঠিক file দিন।"] },
    { title: "04 · Resource information", paragraphs: ["Title পরিষ্কার রাখুন। Description-এ কী কী topic আছে লিখুন। Table of Contents দিলে buyer দ্রুত content বুঝতে পারে।"] },
    { title: "05 · Pricing & Platform fee", paragraphs: ["Paid resource-এ Seller price আপনার resource-এর base price। Buyer pays-এ Platform fee যোগ হতে পারে। Seller earning ও platform fee authoritative transaction records থেকে হিসাব হয়—UI দিয়ে financial value বানানো হয় না।"] },
    { title: "06 · Review & Approval", paragraphs: ["Submit করার পর resource Pending review-এ যাবে। Admin approve করলে resource publish হবে; reject হলে rejection reason দেখে প্রয়োজনমতো ঠিক করে পুনরায় submit করুন।"] },
    { title: "07 · Sales & Earnings", paragraphs: ["Sales & Earnings-এ approved sales, seller earning, pending payout এবং paid payout status দেখুন। Balance নিয়ে প্রশ্ন হলে purchase → seller earning → wallet → payout chain অনুসরণ করা হয়।"] },
    { title: "08 · Content Rules", paragraphs: ["নিজের তৈরি বা legally shareable material upload করুন। Misleading title, duplicate resource, unauthorized copyrighted material বা harmful content upload করবেন না।"] },
    { title: "09 · Storage awareness", paragraphs: ["Upload-এর আগে Preview করে ভুল file এড়ান। অপ্রয়োজনীয় duplicate বা oversized file storage usage বাড়াতে পারে। Resource delete হলেও historical financial records স্বয়ংক্রিয়ভাবে মুছে যায় না।"] },
  ]},
  admin: { title: "Admin Guide", subtitle: "Moderation, users, payments, payouts, resources, storage ও security operations safely পরিচালনার guide।", sections: [
    { title: "01 · Admin responsibility", paragraphs: ["Admin action-এর মূল লক্ষ্য হলো platform integrity, fair moderation, financial accuracy, security এবং user support বজায় রাখা।"] },
    { title: "02 · Pending Uploads", paragraphs: ["Resource file, title, course, seller, pricing ও content quality review করুন। Batch upload হলে সব sibling files একসাথে বিবেচনা করুন।"] },
    { title: "03 · Seller Verification", paragraphs: ["Verification request-এর submitted information যাচাই করে approve বা reject করুন। Decision-এর কারণ পরিষ্কার রাখুন।"] },
    { title: "04 · Payments & Payouts", paragraphs: ["Purchase approval-এর আগে buyer payment তথ্য যাচাই করুন। Payout-এর ক্ষেত্রে purchase → seller earning → wallet → payout chain authoritative database records দিয়ে verify করুন।"] },
    { title: "05 · Financial safety", paragraphs: ["Client-provided price, seller ID, fee বা payout amount trust করবেন না। কোনো balance mismatch হলে UI patch না করে authoritative purchase/earning/wallet/payout records trace করুন।"] },
    { title: "06 · Storage Health", paragraphs: ["Storage Health-এ Original, Preview, Thumbnail, growth, reclaimable orphan এবং preview traffic দেখুন। Storage এবং download traffic এক জিনিস নয়। Storage quota value invent করবেন না; configured quota ব্যবহার করুন।"] },
    { title: "07 · Safe cleanup", paragraphs: ["Orphan candidate delete করার আগে নিশ্চিত করুন যে object কোনো valid resource, preview অথবা financial/history workflow-এর অংশ নয়। Grace-period rule অনুসরণ করুন।"] },
    { title: "08 · Security", paragraphs: ["Private storage file public করবেন না শুধু preview সহজ করার জন্য। RLS, server-side authorization, signed/protected access এবং role checks intact রাখুন। Service keys বা secrets কোনো guide/UI-তে প্রকাশ করবেন না।"] },
    { title: "09 · Troubleshooting", paragraphs: ["Preview failure হলে access rule ও preview artifact দেখুন। Upload failure হলে database row এবং storage object cleanup হয়েছে কিনা যাচাই করুন। Payment/payout সমস্যা হলে historical financial records পরিবর্তন না করে root cause trace করুন।"] },
  ]},
};

const ROLE_META = {
  student: { icon: BookOpen, accent: "border-primary/30 bg-primary/5", button: "Read Student Guide" },
  seller: { icon: Store, accent: "border-emerald-500/30 bg-emerald-500/5", button: "Read Seller Guide" },
  admin: { icon: ShieldCheck, accent: "border-violet-500/30 bg-violet-500/5", button: "Read Admin Guide" },
};

export function RoleGuideBanner({ role }: { role: GuideRole }) {
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const guide = GUIDE_CONTENT[role];
  const meta = ROLE_META[role];
  const Icon = meta.icon;

  if (closed) return <button type="button" onClick={() => setClosed(false)} className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent"><Info className="h-4 w-4" />Show guide</button>;

  return <>
    <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${meta.accent}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm"><Icon className="h-6 w-6" /></div>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">EWU StudyHub · Help Center</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">{guide.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{guide.subtitle}</p></div>
        </div>
        <div className="flex shrink-0 gap-2"><Button type="button" onClick={() => setOpen(true)}>{meta.button}</Button><Button type="button" variant="ghost" size="icon" onClick={() => setClosed(true)} aria-label="Hide guide"><X className="h-4 w-4" /></Button></div>
      </div>
    </section>

    {open && <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 p-2 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={`${role}-guide-title`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b p-4 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">EWU StudyHub · Full Guide</p><h2 id={`${role}-guide-title`} className="mt-1 text-2xl font-bold">{guide.title}</h2><p className="mt-1 text-sm text-muted-foreground">সব নির্দেশনা একই window-এর মধ্যে। প্রয়োজনীয় section expand করে পড়ুন।</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close guide"><X className="h-5 w-5" /></Button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6"><div className="grid gap-3">{guide.sections.map((section, index) => <GuideSectionView key={section.title} index={index} section={section} />)}</div></div>
        <footer className="border-t p-3 sm:flex sm:items-center sm:justify-between sm:p-4"><p className="text-xs text-muted-foreground">Quick help দরকার হলে page-এর ⓘ Info button ব্যবহার করুন।</p><Button type="button" onClick={() => setOpen(false)}>Got it</Button></footer>
      </div>
    </div>}
  </>;
}

function GuideSectionView({ index, section }: { index: number; section: GuideSection }) {
  const [expanded, setExpanded] = useState(index < 2);
  return <div className="rounded-2xl border bg-card"><button type="button" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left" onClick={() => setExpanded((value) => !value)}><span className="font-semibold">{section.title}</span>{expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}</button>{expanded ? <div className="border-t px-4 py-4 text-sm leading-7 text-muted-foreground"><div className="space-y-3">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div></div> : null}</div>;
}
