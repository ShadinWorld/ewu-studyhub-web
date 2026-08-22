import Link from "next/link";
import Image from "next/image";
import { Star, Download, FileText, BadgeCheck, Eye, Clock3, CheckCircle2, XCircle, ShoppingBag, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/constants";
import { SaveResourceButton } from "@/components/files/save-resource-button";
import { getPlatformPricing, getResourceFeeMap } from "@/lib/platform-pricing";
import { createClient } from "@/lib/supabase/server";
import type { ResourceCategory, FilePricingType, PurchaseStatus } from "@/types/database.types";

export interface ResourceCardData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  file_kind?: string | null;
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
  seller_id?: string | null;
  displayPriceCents?: number;
  resourceVisibility?: string | null;
  upload_batch_id?: string | null;
  batchFileCount?: number;
  batchFileKinds?: string[];
}

function StatusBadge({ file }: { file: ResourceCardData }) {
  if (file.isOwner && file.resourceVisibility === "draft") return <Badge className="rounded-full bg-amber-500 px-2.5 text-white shadow-sm hover:bg-amber-500"><Clock3 className="mr-1 h-3.5 w-3.5" />PENDING REVIEW</Badge>;
  if (file.isOwner && file.resourceVisibility === "rejected") return <Badge variant="destructive" className="rounded-full">REJECTED</Badge>;
  if (file.isOwner && file.resourceVisibility === "archived") return <Badge variant="secondary" className="rounded-full">REMOVED</Badge>;
  if (file.isOwner) return <Badge className="rounded-full bg-primary px-2.5 text-primary-foreground shadow-sm">YOUR RESOURCE</Badge>;
  if (file.pricing_type === "free") return <Badge variant="success" className="rounded-full px-2.5 shadow-sm">FREE</Badge>;
  if (file.purchaseStatus === "completed") return <Badge className="rounded-full bg-emerald-600 px-2.5 text-white shadow-sm hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />PURCHASED</Badge>;
  if (file.purchaseStatus === "pending") return <Badge className="rounded-full bg-amber-500 px-2.5 text-white shadow-sm hover:bg-amber-500"><Clock3 className="mr-1 h-3.5 w-3.5" />PAYMENT PENDING</Badge>;
  if (file.purchaseStatus === "failed") return <Badge variant="destructive" className="rounded-full px-2.5 shadow-sm"><XCircle className="mr-1 h-3.5 w-3.5" />PAYMENT REJECTED</Badge>;
  if (file.purchaseStatus === "refunded") return <Badge variant="secondary" className="rounded-full px-2.5 shadow-sm">REFUNDED</Badge>;
  return <Badge variant="default" className="rounded-full px-2.5 shadow-sm">{formatBDT(file.displayPriceCents ?? file.price_cents)}</Badge>;
}

function ActionArea({ file }: { file: ResourceCardData }) {
  if (file.isOwner && file.resourceVisibility === "draft") return <div className="flex h-9 flex-1 items-center justify-center rounded-lg bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300">Waiting for admin approval</div>;
  if (file.isOwner && file.resourceVisibility === "rejected") return <div className="flex h-9 flex-1 items-center justify-center rounded-lg bg-destructive/10 px-3 text-xs font-semibold text-destructive">Rejected by admin</div>;
  if (file.isOwner) return <><Link href={`/files/${file.id}`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><Eye className="h-3.5 w-3.5" />View</Link><a href={`/api/files/${file.id}/download`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border bg-background px-2 text-[11px] font-semibold hover:bg-accent sm:px-3 sm:text-xs"><Download className="h-3.5 w-3.5" />Download</a></>;
  if (file.purchaseStatus === "pending") return <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock3 className="h-3.5 w-3.5" /> Waiting for approval </div>;
  if (file.purchaseStatus === "completed") return <><Link href={`/files/${file.id}/viewer`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-3 sm:text-xs"><Eye className="h-3.5 w-3.5 shrink-0" /> View</Link><a href={`/api/files/${file.id}/download`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Download resource"><Download className="h-3.5 w-3.5" /></a></>;
  if (file.pricing_type === "free") return <><Link href={`/files/${file.id}?preview=1`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-3 sm:text-xs"><Eye className="h-3.5 w-3.5 shrink-0" /> Preview</Link><a href={`/api/files/${file.id}/download`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Download resource"><Download className="h-3.5 w-3.5" /></a></>;
  return <div className="flex min-w-0 flex-1 gap-1.5"><Link href={`/files/${file.id}?preview=1`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border bg-background px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent sm:px-3 sm:text-xs"><Eye className="h-3.5 w-3.5 shrink-0" /> Preview</Link><Link href={`/checkout/${file.id}`} className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 text-[11px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:px-3 sm:text-xs"><ShoppingBag className="h-3.5 w-3.5 shrink-0" /> {file.purchaseStatus === "failed" ? "Buy again" : `Buy ${formatBDT(file.displayPriceCents ?? file.price_cents)}`}</Link></div>;
}

export function ResourceCard({ file }: { file: ResourceCardData }) {
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      <Link href={`/files/${file.id}`} aria-label={`Open ${file.title}`} className="absolute inset-0">
        {file.thumbnail_url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(file.thumbnail_url) ? <Image src={file.thumbnail_url} alt={file.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-accent/50 to-muted text-muted-foreground"><FileText className="h-10 w-10" /></div>}
      </Link>
      <div className="absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2">
        <div className="flex min-w-0 max-w-[78%] flex-wrap gap-1.5"><StatusBadge file={file} />{file.downloads_count >= 100 && <Badge className="rounded-full bg-foreground/85 px-2.5 text-[10px] text-background shadow-sm hover:bg-foreground/85"><Sparkles className="mr-1 h-3 w-3" />POPULAR</Badge>}</div>
        {!file.isOwner && <SaveResourceButton fileId={file.id} saved={Boolean(file.saved)} />}
      </div>
      <div className="absolute bottom-2 left-2 right-2 z-10 flex items-end justify-between gap-2">
        {file.course_code ? <Badge variant="secondary" className="max-w-[60%] truncate rounded-full bg-background/90 font-mono text-[11px] shadow-sm backdrop-blur">{file.course_code}</Badge> : <span />}
        {(file.batchFileCount ?? 1) > 1 && <Badge variant="secondary" className="shrink-0 rounded-full bg-background/95 px-2.5 text-[10px] font-bold text-foreground shadow-sm backdrop-blur">{file.batchFileCount} files</Badge>} {file.file_kind && <Badge variant="secondary" className="shrink-0 rounded-full bg-background/95 px-2.5 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm backdrop-blur">{file.batchFileKinds?.length ? file.batchFileKinds.slice(0,3).join(" · ") : file.file_kind}</Badge>}
      </div>
    </div>
    <div className="flex min-h-[178px] flex-1 flex-col p-2.5 sm:min-h-[178px] sm:p-4">
      <Link href={`/files/${file.id}`} className="block min-w-0"><Badge variant="outline" className="mb-2 w-fit rounded-full text-[11px] font-normal">{RESOURCE_CATEGORY_LABELS[file.category]}</Badge><h3 className="line-clamp-2 break-words text-[12px] font-bold leading-4 transition-colors group-hover:text-primary sm:text-sm sm:leading-snug">{file.title}</h3></Link>
      {file.seller_name && <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><BadgeCheck className="h-3.5 w-3.5 text-primary" /><span className="truncate">{file.seller_name}</span></p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{file.average_rating.toFixed(1)} ({file.reviews_count})</span><span className="flex items-center gap-2">{file.views_count != null && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{file.views_count}</span>}<span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{file.downloads_count}</span></span></div>
      <div className="mt-3 flex gap-2"><ActionArea file={file} /></div>
    </div>
  </article>;
}

export async function ResourceCardGrid({ files, horizontalMobile = false }: { files: ResourceCardData[]; horizontalMobile?: boolean }) {
  void horizontalMobile;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const seedIds = files.map((file) => file.id);
  const { data: seedMeta } = seedIds.length ? await supabase.from("files").select("id,upload_batch_id").in("id", seedIds) : { data: [] as { id: string; upload_batch_id: string | null }[] };
  const batchBySeed = new Map((seedMeta ?? []).map((row) => [row.id, row.upload_batch_id]));
  const batchIds = Array.from(new Set((seedMeta ?? []).map((row) => row.upload_batch_id).filter((id): id is string => Boolean(id))));
  const { data: batchFiles } = batchIds.length ? await supabase.from("files").select("id,upload_batch_id,file_kind").in("upload_batch_id", batchIds).eq("visibility", "published") : { data: [] as { id: string; upload_batch_id: string | null; file_kind: string | null }[] };
  const filesByBatch = new Map<string, { id: string; upload_batch_id: string | null; file_kind: string | null }[]>();
  for (const row of batchFiles ?? []) filesByBatch.set(row.upload_batch_id ?? row.id, [...(filesByBatch.get(row.upload_batch_id ?? row.id) ?? []), row]);

  const representative = new Map<string, ResourceCardData>();
  for (const file of files) {
    const key = batchBySeed.get(file.id) ?? file.id;
    if (representative.has(key)) continue;
    const members = batchBySeed.get(file.id) ? (filesByBatch.get(key) ?? [{ id: file.id, upload_batch_id: batchBySeed.get(file.id) ?? null, file_kind: file.file_kind ?? null }]) : [{ id: file.id, upload_batch_id: null, file_kind: file.file_kind ?? null }];
    representative.set(key, { ...file, upload_batch_id: batchBySeed.get(file.id) ?? null, batchFileCount: members.length, batchFileKinds: Array.from(new Set(members.map((m) => String(m.file_kind ?? "file").toUpperCase()))) });
  }

  const grouped = Array.from(representative.values());
  const expandedFileIds = Array.from(new Set(grouped.flatMap((file) => file.upload_batch_id ? (filesByBatch.get(file.upload_batch_id)?.map((m) => m.id) ?? [file.id]) : [file.id])));
  const purchaseStatusByGroup = new Map<string, PurchaseStatus>();
  if (user && expandedFileIds.length) {
    const { data: purchases } = await supabase.from("purchases").select("file_id,status,created_at").eq("buyer_id", user.id).in("file_id", expandedFileIds).order("created_at", { ascending: false });
    for (const purchase of purchases ?? []) {
      if (!purchase.file_id) continue;
      const group = grouped.find((file) => file.id === purchase.file_id || (file.upload_batch_id && filesByBatch.get(file.upload_batch_id)?.some((m) => m.id === purchase.file_id)));
      if (!group) continue;
      const key = group.upload_batch_id ?? group.id;
      if (!purchaseStatusByGroup.has(key)) purchaseStatusByGroup.set(key, purchase.status as PurchaseStatus);
      if (purchase.status === "completed") purchaseStatusByGroup.set(key, "completed");
    }
  }

  const feeMap = await getResourceFeeMap(supabase as any, grouped.map((file) => file.id));
  const defaultFee = feeMap.size === grouped.length ? 0 : await getPlatformPricing(supabase as any);
  const normalizedFiles = grouped.map((file) => {
    const key = file.upload_batch_id ?? file.id;
    return {
      ...file,
      purchaseStatus: purchaseStatusByGroup.get(key) ?? file.purchaseStatus ?? null,
      displayPriceCents: file.pricing_type === "paid" ? file.price_cents + (feeMap.get(file.id) ?? defaultFee) : file.price_cents,
      isOwner: Boolean(file.isOwner || (user && file.seller_id === user.id)),
    };
  });
  if (normalizedFiles.length === 0) return <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center"><FileText className="h-9 w-9 text-muted-foreground"/><p className="mt-3 text-sm font-semibold">No resources found</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Try a different search or filter, or check back later.</p></div>;
  return <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{normalizedFiles.map(file => <div key={file.upload_batch_id ?? file.id} className="min-w-0"><ResourceCard file={file}/></div>)}</div>;
}
