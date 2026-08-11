import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

type MyFile = {
  id: string;
  title: string;
  visibility: string;
  pricing_type: string;
  price_cents: number;
  category: string;
  rejection_reason: string | null;
  downloads_count: number;
};

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  draft: { label: "Pending review", variant: "secondary" },
  published: { label: "Live", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

export function MyUploadsList({ files }: { files: MyFile[] }) {
  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        You haven't uploaded anything yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => {
        const status = STATUS_LABEL[file.visibility] ?? { label: file.visibility, variant: "outline" };
        return (
          <div key={file.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{file.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Badge variant={file.pricing_type === "free" ? "success" : "default"}>
                    {file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}
                  </Badge>
                  <span className="text-muted-foreground">{file.downloads_count} downloads</span>
                </div>
                {file.visibility === "rejected" && file.rejection_reason && (
                  <p className="mt-1 text-xs text-destructive">Reason: {file.rejection_reason}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer">
                  <Eye className="mr-1 h-4 w-4" /> Preview
                </a>
              </Button>
              {file.visibility === "published" && (
                <Button size="sm" asChild>
                  <Link href={`/files/${file.id}`}>Public page</Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
