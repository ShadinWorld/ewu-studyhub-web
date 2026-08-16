import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, Clock3,
  Download, Eye, FileText, FolderOpen, HardDrive, Lock, ShoppingBag,
  Star, UserRound, XCircle, ShieldCheck, TrendingUp,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/constants";
import { ReviewSection } from "@/components/reviews/review-section";
import { ReportResourceButton } from "@/components/files/report-resource-button";
import { ResourceDetailActions } from "@/components/files/resource-detail-actions";
import { StickyResourceActionBar } from "@/components/files/sticky-resource-action-bar";
import { QualityIndicator } from "@/components/files/quality-indicator";
import type { ResourceCardData } from "@/components/files/resource-card";
import { ResourceCardGrid } from "@/components/files/resource-card";
import type { FilePricingType } from "@/types/database.types";

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function StarSummary({ rating, count }: { rating: number; count: number }) {
  return <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1.5 text-sm font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{rating.toFixed(1)}</span><span className="text-sm text-muted-foreground">{count} {count === 1 ? "review" : "reviews"}</span></div>;
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0"><div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></div><span className="max-w-[60%] text-right text-sm font-medium">{value}</span></div>;
}

function MiniRelatedCard({ file }: { file: ResourceCardData }) {
  return <Link href={`/files/${file.id}`} className="group flex gap-3 rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"><div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">{file.thumbnail_url ? <Image src={file.thumbnail_url} alt="" fill className="object-cover transition-transform group-hover:scale-105" sizes="96px" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted"><FileText className="h-7 w-7 text-muted-foreground" /></div>}</div><div className="min-w-0 flex-1">{file.course_code && <p className="font-mono text-[11px] text-primary">{file.course_code}</p>}<h3 className="mt-0.5 line-clamp-2 text-sm font-semibold group-hover:text-primary">{file.title}</h3><div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{file.average_rating.toFixed(1)} ({file.reviews_count})</span><span>{file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}</span></div></div></Link>;
}

export default async function FileDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = createAdminClient();
  const { data: file } = await supabase.from("files").select(`id, seller_id, title, description, table_of_contents, category, file_kind, pricing_type, price_cents, thumbnail_url, preview_storage_path, page_count, file_size_bytes, semester, year, language, created_at, average_rating, reviews_count, downloads_count, views_count, ai_summary, ai_keywords, ai_difficulty, ai_reading_time_minutes, course_id, department_id, courses (course_code, course_name)`).eq("id", params.id).eq("visibility", "published").single();
  if (!file) notFound();
  await admin.rpc("increment_view_count", { p_file_id: params.id });
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("recently_viewed").upsert({ profile_id: user.id, file_id: params.id, viewed_at: new Date().toISOString() });
  const course = Array.isArray(file.courses) ? file.courses[0] : file.courses;

  const [{ data: seller }, { data: purchase }, { data: department }, { data: sameCourseFiles }, { data: relatedFiles }] = await Promise.all([
    admin.from("profiles").select("id, full_name, avatar_url, university_email, university_email_verified, student_id_verification_status, seller_bio").eq("id", file.seller_id).maybeSingle(),
    user ? supabase.from("purchases").select("id, status, rejection_reason, created_at").eq("file_id", params.id).eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    file.department_id ? supabase.from("departments").select("id, name, short_name").eq("id", file.department_id).maybeSingle() : Promise.resolve({ data: null }),
    file.course_id ? supabase.from("files").select("id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, department_id, seller_id, semester, year").eq("course_id", file.course_id).eq("visibility", "published").neq("id", file.id).order("downloads_count", { ascending: false }).limit(12) : Promise.resolve({ data: [] }),
    supabase.from("files").select("id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, department_id, seller_id, semester, year").eq("visibility", "published").neq("id", file.id).limit(40),
  ]);

  const rawPurchaseStatus = purchase?.status;
  const purchaseStatus = rawPurchaseStatus === "pending" || rawPurchaseStatus === "completed" || rawPurchaseStatus === "failed" || rawPurchaseStatus === "refunded" ? rawPurchaseStatus : null;
  const rejectionReason = typeof purchase?.rejection_reason === "string" ? purchase.rejection_reason : null;
  const isFree = file.pricing_type === "free";
  const alreadyPurchased = purchaseStatus === "completed";
  const paymentPending = purchaseStatus === "pending";
  const paymentRejected = purchaseStatus === "failed";
  const canDownloadDirectly = isFree || alreadyPurchased;
  const previewUrl = file.preview_storage_path ? supabase.storage.from("files-preview").getPublicUrl(file.preview_storage_path).data.publicUrl : canDownloadDirectly ? `/api/files/${file.id}/view` : null;
  const previewPageCount = file.page_count && !canDownloadDirectly ? Math.max(1, Math.min(file.page_count - 1, Math.ceil(file.page_count * 0.2))) : null;

  const sellerFileIdsResult = await admin.from("files").select("id").eq("seller_id", file.seller_id).eq("visibility", "published");
  const sellerFileIds = (sellerFileIdsResult.data ?? []).map((item) => item.id);
  const [sellerSalesQuery, sellerReviewsQuery] = await Promise.all([
    sellerFileIds.length ? admin.from("purchases").select("id", { count: "exact", head: true }).in("file_id", sellerFileIds).eq("status", "completed") : Promise.resolve({ count: 0 }),
    sellerFileIds.length ? admin.from("reviews").select("rating").in("file_id", sellerFileIds) : Promise.resolve({ data: [] as { rating: number }[] }),
  ]);
  const sellerReviews = sellerReviewsQuery.data ?? [];
  const sellerRating = sellerReviews.length ? sellerReviews.reduce((sum, r) => sum + Number(r.rating), 0) / sellerReviews.length : 0;

  const mapCard = (item: any): ResourceCardData => ({ id: item.id, title: item.title, thumbnail_url: item.thumbnail_url, pricing_type: item.pricing_type as FilePricingType, price_cents: item.price_cents, average_rating: Number(item.average_rating ?? 0), reviews_count: item.reviews_count ?? 0, downloads_count: item.downloads_count ?? 0, category: item.category, course_code: course?.course_code ?? null, views_count: item.views_count ?? 0 });
  const sameCourse = (sameCourseFiles ?? []).map(mapCard).slice(0, 4);
  const sameCourseIds = new Set(sameCourse.map((item) => item.id));
  const scoredRelated = (relatedFiles ?? []).filter((item) => !sameCourseIds.has(item.id)).map((item: any) => {
    let score = 0;
    if (item.department_id && item.department_id === file.department_id) score += 35;
    if (item.category === file.category) score += 25;
    if (item.semester && item.semester === file.semester) score += 10;
    if (item.year && item.year === file.year) score += 5;
    score += Math.min(15, Number(item.downloads_count ?? 0) / 10);
    score += Math.min(10, Number(item.average_rating ?? 0) * 2);
    return { item, score };
  }).sort((a, b) => b.score - a.score).slice(0, 4).map(({ item }) => mapCard(item));

  const verifiedSeller = seller?.student_id_verification_status === "verified" || seller?.university_email_verified;
  const recommendationCount = sellerReviews.length;
  const hasStrongRating = Number(file.reviews_count ?? 0) > 0 && Number(file.average_rating ?? 0) >= 4;
  const qualitySignals = [Boolean(file.description), Boolean(previewUrl), Boolean(file.page_count), hasStrongRating, Number(file.downloads_count ?? 0) >= 5].filter(Boolean).length;
  const benefits = [
    course?.course_code ? `${course.course_code}-specific academic material` : "Course-linked academic material",
    file.page_count ? `${file.page_count} pages of organized material` : "Ready-to-use academic material",
    previewUrl && !canDownloadDirectly ? `${previewPageCount ?? 1}-page free preview before purchase` : canDownloadDirectly ? "Instant access and download" : "Protected purchase and download access",
    verifiedSeller ? "Uploaded by a verified EWU seller" : "Uploaded by an EWU StudyHub seller",
    file.reviews_count > 0 ? `${Number(file.average_rating).toFixed(1)}★ from verified student feedback` : "Student feedback can help you judge quality",
  ].slice(0, 4);

  return <div className="flex min-h-screen flex-col pb-20 lg:pb-0"><Navbar /><main className="container flex-1 py-6 sm:py-10">
    <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb"><Link href="/" className="hover:text-foreground">Home</Link><span>/</span><Link href="/courses" className="hover:text-foreground">Courses</Link><span>/</span>{course?.course_code && <><Link href={`/course/${file.course_id}`} className="font-mono hover:text-foreground">{course.course_code}</Link><span>/</span></>}<span className="truncate text-foreground">{file.title}</span></nav>
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"><div className="min-w-0">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted sm:aspect-[2/1]">
          {previewUrl && (file.file_kind === "pdf" || file.file_kind === "image") && !alreadyPurchased && file.preview_storage_path ? <iframe title={`Preview of ${file.title}`} src={previewUrl} className="h-full w-full bg-white" /> : file.thumbnail_url ? <Image src={file.thumbnail_url} alt={file.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 70vw" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/50 to-muted"><FileText className="h-16 w-16 text-muted-foreground" /></div>}
          <div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2"><Badge className="rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur">{RESOURCE_CATEGORY_LABELS[file.category]}</Badge><div className="flex gap-2"><Badge variant="secondary" className="rounded-full bg-background/90 shadow-sm backdrop-blur">{file.file_kind.toUpperCase()}</Badge>{isFree ? <Badge variant="success" className="rounded-full">FREE</Badge> : <Badge className="rounded-full">{formatBDT(file.price_cents)}</Badge>}</div></div>
        </div>
        <div className="p-5 sm:p-7"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{course?.course_code && <Badge variant="outline" className="font-mono">{course.course_code}</Badge>}{course?.course_name && <span>{course.course_name}</span>}{department?.short_name && <><span>•</span><span>{department.short_name}</span></>}</div><h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{file.title}</h1><div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2"><StarSummary rating={Number(file.average_rating ?? 0)} count={file.reviews_count ?? 0} /><span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Download className="h-4 w-4" />{file.downloads_count} downloads</span><span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Eye className="h-4 w-4" />{file.views_count} views</span></div><div className="mt-5 flex flex-wrap gap-2">{file.semester && <Badge variant="secondary">{file.semester}{file.year ? ` ${file.year}` : ""}</Badge>}{file.language && <Badge variant="secondary">{file.language.toUpperCase()}</Badge>}{file.ai_difficulty && <Badge variant="secondary">{file.ai_difficulty} difficulty</Badge>}{file.ai_reading_time_minutes && <Badge variant="secondary">~{file.ai_reading_time_minutes} min read</Badge>}</div></div>
      </div>

      <section className="mt-7 rounded-2xl border bg-card p-5 sm:p-7"><h2 className="text-xl font-bold">About this resource</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{file.description || "The seller has not added a description yet."}</p>{file.ai_summary && <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-semibold text-primary">Quick summary</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{file.ai_summary}</p></div>}{!!file.ai_keywords?.length && <div className="mt-5 flex flex-wrap gap-2">{file.ai_keywords.slice(0, 10).map((keyword) => <Badge key={keyword} variant="outline">#{keyword}</Badge>)}</div>}</section>
      {file.table_of_contents && <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">What’s inside</p><h2 className="mt-1 text-xl font-bold">Table of contents</h2></div><Badge variant="outline">Topics</Badge></div><div className="mt-4 whitespace-pre-line rounded-xl bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">{file.table_of_contents}</div></section>}

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7"><h2 className="text-xl font-bold">Resource details</h2><div className="mt-2 divide-y"><DetailRow icon={BookOpen} label="Course" value={course ? `${course.course_code} — ${course.course_name}` : "—"} /><DetailRow icon={FolderOpen} label="Department" value={department?.name || "—"} /><DetailRow icon={FileText} label="Type" value={RESOURCE_CATEGORY_LABELS[file.category]} /><DetailRow icon={HardDrive} label="File" value={`${file.file_kind.toUpperCase()} • ${formatBytes(file.file_size_bytes)}`} /><DetailRow icon={FileText} label="Pages" value={file.page_count ?? "—"} /><DetailRow icon={CalendarDays} label="Uploaded" value={new Date(file.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })} /><DetailRow icon={Download} label="Downloads" value={file.downloads_count} /></div></section>

      <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 gap-4">{seller?.avatar_url ? <Image src={seller.avatar_url} alt="" width={56} height={56} className="h-14 w-14 rounded-full border object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted"><UserRound className="h-6 w-6 text-muted-foreground" /></div>}<div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Uploaded by</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold"><span className="truncate">{seller?.full_name || "EWU Seller"}</span>{verifiedSeller && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" />}</h2><p className="mt-1 text-xs text-muted-foreground">{verifiedSeller ? "Verified EWU seller" : "EWU StudyHub seller"}</p>{sellerReviews.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{sellerRating.toFixed(1)} seller rating · {sellerReviews.length} review{sellerReviews.length === 1 ? "" : "s"}</p>}</div></div><div className="grid grid-cols-2 gap-3 text-center text-xs sm:min-w-[230px]"><div className="rounded-xl bg-muted/40 p-3"><p className="text-lg font-bold">{sellerFileIds.length}</p><p className="text-muted-foreground">Resources</p></div><div className="rounded-xl bg-muted/40 p-3"><p className="text-lg font-bold">{sellerSalesQuery.count ?? 0}</p><p className="text-muted-foreground">Completed sales</p></div></div></div>{seller?.seller_bio && <p className="mt-4 text-sm leading-6 text-muted-foreground">{seller.seller_bio}</p>}<div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline"><ShieldCheck className="mr-1 h-3.5 w-3.5" />EWU seller verification</Badge><Badge variant="outline"><TrendingUp className="mr-1 h-3.5 w-3.5" />{sellerFileIds.length} published resources</Badge></div><Button asChild variant="outline" className="mt-4"><Link href={`/seller/${file.seller_id}`}>View seller profile <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></section>

      <QualityIndicator rating={Number(file.average_rating ?? 0)} reviews={file.reviews_count ?? 0} downloads={file.downloads_count ?? 0} pages={file.page_count} hasDescription={Boolean(file.description)} hasPreview={Boolean(previewUrl)} />
      <ReviewSection fileId={file.id} />

      {sameCourse.length > 0 && <section className="mt-10 border-t pt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">More from this course</p><h2 className="mt-1 text-2xl font-bold">{course?.course_code || "This course"}</h2></div>{file.course_id && <Link href={`/course/${file.course_id}`} className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">View all <ArrowRight className="h-4 w-4" /></Link>}</div><div className="mt-5 grid gap-3 sm:grid-cols-2">{sameCourse.map((item) => <MiniRelatedCard key={item.id} file={item} />)}</div></section>}
      {scoredRelated.length > 0 && <section className="mt-10 border-t pt-8"><div><p className="text-sm font-semibold text-primary">You may also like</p><h2 className="mt-1 text-2xl font-bold">Related resources</h2><p className="mt-1 text-sm text-muted-foreground">Similar course, category, semester and popular resources.</p></div><div className="mt-5"><ResourceCardGrid files={scoredRelated} /></div></section>}
    </div>

    <aside className="lg:sticky lg:top-24"><div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource access</p><p className="mt-1 text-3xl font-bold">{isFree ? "Free" : formatBDT(file.price_cents)}</p></div><StarSummary rating={Number(file.average_rating ?? 0)} count={file.reviews_count ?? 0} /></div>{alreadyPurchased && <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold">You own this resource</p><p className="mt-1 text-sm text-muted-foreground">Payment approved. View or download anytime.</p></div></div></div>}{paymentPending && <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" /><div><p className="font-semibold">Payment pending</p><p className="mt-1 text-sm text-muted-foreground">Waiting for admin verification. Please do not pay again.</p></div></div></div>}{paymentRejected && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><div className="flex items-start gap-3"><XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="font-semibold">Payment needs attention</p><p className="mt-1 text-sm text-muted-foreground">{rejectionReason || "The previous payment could not be verified."}</p></div></div></div>}{!canDownloadDirectly && previewUrl && <div className="mt-4 rounded-xl border bg-muted/20 p-4"><div className="flex items-start gap-3"><Lock className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-semibold">Free preview available</p><p className="mt-1 text-xs text-muted-foreground">{previewPageCount && file.page_count ? `${previewPageCount} of ${file.page_count} pages` : "Sample preview"} before purchase.</p><Link href={`/files/${file.id}/viewer?preview=1`} className="mt-2 inline-flex text-xs font-semibold text-primary underline">Open preview viewer</Link></div></div></div>}<ResourceDetailActions fileId={file.id} isFree={isFree} alreadyPurchased={alreadyPurchased} paymentPending={paymentPending} paymentRejected={paymentRejected} /><div className="mt-5 border-t pt-4"><ReportResourceButton fileId={file.id} /></div></div>

    </aside>
    </div>
  </main><StickyResourceActionBar fileId={file.id} isFree={isFree} alreadyPurchased={alreadyPurchased} paymentPending={paymentPending} paymentRejected={paymentRejected} price={file.price_cents} /><Footer /></div>;
}
