import Link from "next/link";
import Image from "next/image";
import { Star, Download, FileText, BadgeCheck, Eye, Clock3, CheckCircle2, XCircle, ShoppingBag, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/constants";
import { SaveResourceButton } from "@/components/files/save-resource-button";
import type { ResourceCategory, FilePricingType, PurchaseStatus } from "@/types/database.types";

export interface ResourceCardData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  pricing_type: FilePricingType;
  price_cents: number;
  average_rating: number;
  reviews_count: number;
  downloads_count: number;
  category: ResourceCategory;
  course_code?: string | null;
  seller_name?: string | null;
  views_count?: number;
  saved?: boolean;
  purchaseStatus?: PurchaseStatus | null;
  rejectionReason?: string | null;
  isOwner?: boolean;
}

function StatusBadge({ file }: { file: ResourceCardData }) {
  if (file.isOwner) return <Badge className="rounded-full bg-primary px-2.5 text-primary-foreground shadow-sm">YOUR RESOURCE</Badge>;
  if (file.pricing_type === "free") return <Badge variant="success" className="rounded-full px-2.5 shadow-sm">FREE</Badge>;
  if (file.purchaseStatus === "completed") return <Badge className="rounded-full bg-emerald-600 px-2.5 text-white shadow-sm hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />PURCHASED</Badge>;
  if (file.purchaseStatus === "pending") return <Badge className="rounded-full bg-amber-500 px-2.5 text-white shadow-sm hover:bg-amber-500"><Clock3 className="mr-1 h-3.5 w-3.5" />PAYMENT PENDING</Badge>;
  if (file.purchaseStatus === "failed") return <Badge variant="destructive" className="rounded-full px-2.5 shadow-sm"><XCircle className="mr-1 h-3.5 w-3.5" />PAYMENT REJECTED</Badge>;
  if (file.purchaseStatus === "refunded") return <Badge variant="secondary" className="rounded-full px-2.5 shadow-sm">REFUNDED</Badge>;
  return <Badge variant="default" className="rounded-full px-2.5 shadow-sm">{formatBDT(file.price_cents)}</Badge>;
}

function ActionArea({ file }: { file: ResourceCardData }) {
  if (file.isOwner) return <><Link href={`/files/${file.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><Eye className="h-3.5 w-3.5" />View</Link><Link href="/dashboard" className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border bg-background px-3 text-xs font-semibold hover:bg-accent">Manage</Link></>;
  if (file.purchaseStatus === "pending") return <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock3 className="h-3.5 w-3.5" /> Waiting for approval </div>;
  if (file.purchaseStatus === "completed" || file.pricing_type === "free") return <><a href={`/api/files/${file.id}/view`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><Eye className="h-3.5 w-3.5" /> View </a><a href={`/api/files/${file.id}/download`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Download resource"><Download className="h-3.5 w-3.5" /></a></>;
  return <Link href={`/checkout/${file.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><ShoppingBag className="h-3.5 w-3.5" /> {file.purchaseStatus === "failed" ? "Buy again" : `Buy ${formatBDT(file.price_cents)}`}</Link>;
}

export function ResourceCard({ file }: { file: ResourceCardData }) {
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      <Link href={`/files/${file.id}`} aria-label={`Open ${file.title}`} className="absolute inset-0">
        {file.thumbnail_url ? <Image src={file.thumbnail_url} alt={file.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/50 to-muted text-muted-foreground"><FileText className="h-10 w-10" /></div>}
      </Link>
      <div className="absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2">
        <div className="flex min-w-0 max-w-[78%] flex-wrap gap-1.5"><StatusBadge file={file} />{file.downloads_count >= 100 && <Badge className="rounded-full bg-foreground/85 px-2.5 text-[10px] text-background shadow-sm hover:bg-foreground/85"><Sparkles className="mr-1 h-3 w-3" />POPULAR</Badge>}</div>
        {!file.isOwner && <SaveResourceButton fileId={file.id} saved={Boolean(file.saved)} />}
      </div>
      {file.course_code && <div className="absolute bottom-2 left-2 z-10"><Badge variant="secondary" className="rounded-full bg-background/90 font-mono text-[11px] shadow-sm backdrop-blur">{file.course_code}</Badge></div>}
    </div>
    <div className="flex min-h-[168px] flex-1 flex-col p-3 sm:min-h-[178px] sm:p-4">
      <Link href={`/files/${file.id}`} className="block min-w-0"><Badge variant="outline" className="mb-2 w-fit rounded-full text-[11px] font-normal">{RESOURCE_CATEGORY_LABELS[file.category]}</Badge><h3 className="line-clamp-2 text-[13px] font-bold leading-snug transition-colors group-hover:text-primary sm:text-sm">{file.title}</h3></Link>
      {file.seller_name && <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" /><span className="truncate">{file.seller_name}</span></p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{file.average_rating.toFixed(1)} ({file.reviews_count})</span><span className="flex items-center gap-2">{file.views_count != null && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{file.views_count}</span>}<span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{file.downloads_count}</span></span></div>
      <div className="mt-3 flex gap-2"><ActionArea file={file} /></div>
    </div>
  </article>;
}

export function ResourceCardGrid({ files, horizontalMobile = false }: { files: ResourceCardData[]; horizontalMobile?: boolean }) {
  void horizontalMobile;
  if (files.length === 0) return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center"><FileText className="h-9 w-9 text-muted-foreground"/><p className="mt-3 text-sm font-semibold">No resources found</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Try a different search or filter, or check back later.</p></div>;
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{files.map(file => <div key={file.id} className="min-w-0"><ResourceCard file={file}/></div>)}</div>;
}
