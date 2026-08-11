import { FileText } from "lucide-react";
import { FileCard } from "@/components/files/file-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileResource } from "@/types/database.types";

type GridFile = Pick<FileResource,
  "id" | "title" | "thumbnail_url" | "pricing_type" | "price_cents" |
  "average_rating" | "reviews_count" | "downloads_count" | "category"
>;

export function FileGrid({ files }: { files: GridFile[] }) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
        <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">No resources found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  );
}

export function FileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
