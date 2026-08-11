import { createClient } from "@/lib/supabase/server";
import { UploadReviewCard } from "@/components/admin/upload-review-card";

export default async function PendingUploadsPage() {
  const supabase = createClient();

  const { data: files } = await supabase
    .from("files")
    .select(
      `id, title, description, category, file_kind, pricing_type, price_cents,
       file_size_bytes, page_count, created_at, storage_path,
       seller:profiles!files_seller_id_fkey (full_name, username)`
    )
    .eq("visibility", "draft")
    .order("created_at", { ascending: true });

  if (!files || files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        No pending uploads. All caught up! 🎉
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{files.length} file(s) waiting for review</p>
      {files.map((file: any) => (
        <UploadReviewCard key={file.id} file={file} />
      ))}
    </div>
  );
}
