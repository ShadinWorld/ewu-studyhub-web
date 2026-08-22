import Link from "next/link";
import { Eye, FileText, Files } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
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
  upload_batch_id: string | null;
};

const STATUS_LABEL: Record<string, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  draft: { label: "Pending review", variant: "secondary" },
  published: { label: "Live", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

export function MyUploadsList({ files }: { files: MyFile[] }) {
  if (files.length === 0) return <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">You haven't uploaded anything yet.</div>;

  const groups = new Map<string, MyFile[]>();
  for (const file of files) {
    const key = file.upload_batch_id ?? file.id;
    groups.set(key, [...(groups.get(key) ?? []), file]);
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.values()).map((group) => {
        const file = group[0];
        const status = STATUS_LABEL[file.visibility] ?? { label: file.visibility, variant: "outline" as const };
        return (
          <div key={file.upload_batch_id ?? file.id} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">{group.length > 1 ? <Files className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-muted-foreground" />}</div>
              <div className="min-w-0">
                <p className="break-words font-medium">{file.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {group.length > 1 && <Badge variant="outline">{group.length} files in one resource</Badge>}
                  {file.visibility === "draft" && <span className="font-semibold text-amber-700 dark:text-amber-300">Admin approval pending</span>}
                  {file.visibility === "published" && <span className="font-semibold text-emerald-700 dark:text-emerald-300">Approved & live</span>}
                  {file.visibility === "rejected" && <span className="font-semibold text-destructive">Rejected by admin</span>}
                  <Badge variant={file.pricing_type === "free" ? "success" : "default"}>{file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}</Badge>
                  <span className="text-muted-foreground">{group.reduce((sum, item) => sum + item.downloads_count, 0)} downloads</span>
                </div>
                {file.visibility === "rejected" && file.rejection_reason && <p className="mt-1 text-xs text-destructive">Reason: {file.rejection_reason}</p>}
                {group.length > 1 && <p className="mt-2 text-xs text-muted-foreground">Files: {group.map((item) => item.id.slice(0, 6)).join(" · ")}</p>}
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button size="sm" variant="outline" asChild><a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer"><Eye className="mr-1 h-4 w-4" /> Preview</a></Button>
              {file.visibility === "published" && <Button size="sm" asChild><Link href={`/files/${file.id}`}>Open resource</Link></Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
