import Link from "next/link";
import Image from "next/image";
import { Star, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import type { FileResource } from "@/types/database.types";

export function FileCard({ file }: { file: Pick<FileResource,
  "id" | "title" | "thumbnail_url" | "pricing_type" | "price_cents" |
  "average_rating" | "reviews_count" | "downloads_count" | "category"
> }) {
  return (
    <Link
      href={`/files/${file.id}`}
      className="group rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] relative bg-muted">
        {file.thumbnail_url ? (
          <Image
            src={file.thumbnail_url}
            alt={file.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10" />
          </div>
        )}
        <Badge
          variant={file.pricing_type === "free" ? "success" : "default"}
          className="absolute top-2 right-2"
        >
          {file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}
        </Badge>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{file.title}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {file.average_rating.toFixed(1)} ({file.reviews_count})
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3.5 w-3.5" />
            {file.downloads_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
