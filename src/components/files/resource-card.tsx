import Link from "next/link";
import Image from "next/image";
import { Star, Download, FileText, BadgeCheck, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/constants";
import { SaveResourceButton } from "@/components/files/save-resource-button";
import type { ResourceCategory, FilePricingType } from "@/types/database.types";

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
}

export function ResourceCard({ file }: { file: ResourceCardData }) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link href={`/files/${file.id}`} aria-label={`Open ${file.title}`} className="absolute inset-0">
          {file.thumbnail_url ? (
            <Image
              src={file.thumbnail_url}
              alt={file.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-accent/50 text-muted-foreground">
              <FileText className="h-10 w-10" />
            </div>
          )}
        </Link>
        <div className="absolute left-2 top-2 flex max-w-[70%] gap-1.5">
          {file.course_code && (
            <Badge variant="secondary" className="font-mono shadow-sm">{file.course_code}</Badge>
          )}
        </div>
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          <SaveResourceButton fileId={file.id} saved={Boolean(file.saved)} />
          <Badge variant={file.pricing_type === "free" ? "success" : "default"} className="shadow-sm">
            {file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}
          </Badge>
        </div>
      </div>

      <div className="flex min-h-[154px] flex-1 flex-col p-3.5">
        <Link href={`/files/${file.id}`} className="block min-w-0">
          <Badge variant="outline" className="mb-2 w-fit text-[11px] font-normal">
            {RESOURCE_CATEGORY_LABELS[file.category]}
          </Badge>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
            {file.title}
          </h3>
        </Link>

        {file.seller_name && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{file.seller_name}</span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {file.average_rating.toFixed(1)} ({file.reviews_count})
          </span>
          <span className="flex items-center gap-2">
            {file.views_count != null && (
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{file.views_count}</span>
            )}
            <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{file.downloads_count}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

export function ResourceCardGrid({ files }: { files: ResourceCardData[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No resources found</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Try a different search or filter, or check back later.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {files.map((file) => <ResourceCard key={file.id} file={file} />)}
    </div>
  );
}
