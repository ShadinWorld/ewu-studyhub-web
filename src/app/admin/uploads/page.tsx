import { createClient } from "@/lib/supabase/server";
import { UploadReviewCard, type UploadReviewBatch } from "@/components/admin/upload-review-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default async function PendingUploadsPage() {
  const supabase = createClient();
  const { data: files } = await supabase
    .from("files")
    .select("id,title,description,category,file_kind,pricing_type,price_cents,file_size_bytes,page_count,created_at,storage_path,seller_id,upload_batch_id")
    .eq("visibility", "draft")
    .order("created_at", { ascending: true });

  const sellerIds = Array.from(new Set((files ?? []).map((file) => file.seller_id).filter(Boolean)));
  const { data: sellers } = sellerIds.length ? await supabase.from("profiles").select("id,full_name").in("id", sellerIds) : { data: [] as { id: string; full_name: string | null }[] };
  const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));
  type UploadFileRow = NonNullable<typeof files>[number];
  const batchKeys = new Map<string, UploadFileRow[]>();
  for (const file of files ?? []) {
    const key = file.upload_batch_id ?? file.id;
    const existing = batchKeys.get(key) ?? [];
    existing.push(file);
    batchKeys.set(key, existing);
  }

  const batches: UploadReviewBatch[] = Array.from(batchKeys.entries()).map(([batchId, rows]) => {
    const first = rows[0];
    return {
      batchId,
      title: first.title,
      description: first.description,
      category: first.category,
      pricing_type: first.pricing_type,
      price_cents: first.price_cents,
      created_at: first.created_at,
      seller: { full_name: sellerNames.get(first.seller_id) ?? "Seller" },
      files: rows.map((row) => ({
        id: row.id,
        file_kind: row.file_kind,
        file_size_bytes: row.file_size_bytes,
        page_count: row.page_count,
        file_name: row.storage_path.split("/").pop() ?? null,
      })),
    };
  });

  if (!batches.length) {
    return <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">No pending uploads. All caught up! 🎉</div>;
  }

  const totalFiles = batches.reduce((sum, batch) => sum + batch.files.length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">{batches.length} upload request{batches.length === 1 ? "" : "s"} · {totalFiles} file{totalFiles === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-muted-foreground">Multiple files from one submission stay together as a single review request.</p></div>
        <Button asChild><Link href="/admin/resources/upload"><Upload className="mr-2 h-4 w-4" />Upload multiple</Link></Button>
      </div>
      {batches.map((batch) => <UploadReviewCard key={batch.batchId} batch={batch} />)}
    </div>
  );
}
