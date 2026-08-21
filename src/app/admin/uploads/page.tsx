import { createClient } from "@/lib/supabase/server";
import { UploadReviewCard } from "@/components/admin/upload-review-card";

export default async function PendingUploadsPage() {
  const supabase = createClient();

  const { data: files } = await supabase
    .from("files")
    .select(
      "id, title, description, category, file_kind, pricing_type, price_cents, file_size_bytes, page_count, created_at, storage_path, seller_id"
    )
    .eq("visibility", "draft")
    .order("created_at", { ascending: true });

  const sellerIds = Array.from(new Set((files ?? []).map((file) => file.seller_id).filter(Boolean)));
  const { data: sellers } = sellerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", sellerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));

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
      {files.map((file) => (
        <UploadReviewCard key={file.id} file={{ ...file, seller: { full_name: sellerNames.get(file.seller_id) ?? "Seller" } }} />
      ))}
    </div>
  );
}
