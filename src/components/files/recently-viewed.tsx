import Link from "next/link";
import { Clock3, ArrowRight } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";

export async function RecentlyViewed() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("recently_viewed")
    .select("file_id, viewed_at")
    .eq("profile_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(8);

  const fileIds = (rows ?? []).map((row) => row.file_id);
  if (!fileIds.length) return null;

  const { data: files } = await supabase
    .from("files")
    .select("id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id")
    .in("id", fileIds)
    .eq("visibility", "published");

  const courseIds = Array.from(new Set((files ?? []).map((file) => file.course_id).filter((id): id is string => Boolean(id))));
  const sellerIds = Array.from(new Set((files ?? []).map((file) => file.seller_id)));
  const [{ data: courses }, { data: sellers }] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id, course_code").in("id", courseIds) : Promise.resolve({ data: [] as { id: string; course_code: string }[] }),
    sellerIds.length ? createAdminClient().from("profiles").select("id, full_name").in("id", sellerIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const courseCodes = new Map((courses ?? []).map((course) => [course.id, course.course_code]));
  const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));
  const byId = new Map((files ?? []).map((file) => [file.id, file]));
  const { data: purchases } = await supabase
    .from("purchases")
    .select("file_id, status, created_at")
    .eq("buyer_id", user.id)
    .in("file_id", fileIds)
    .order("created_at", { ascending: false });
  const purchaseStatusByFileId = new Map<string, "pending" | "completed" | "failed" | "refunded">();
  for (const purchase of purchases ?? []) {
    if (purchase.file_id && !purchaseStatusByFileId.has(purchase.file_id) && ["pending", "completed", "failed", "refunded"].includes(String(purchase.status))) {
      purchaseStatusByFileId.set(purchase.file_id, purchase.status as "pending" | "completed" | "failed" | "refunded");
    }
  }
  const resources: ResourceCardData[] = fileIds
    .map((id) => byId.get(id))
    .filter((file): file is NonNullable<typeof file> => Boolean(file))
    .map((file) => ({
      ...file,
      course_code: file.course_id ? courseCodes.get(file.course_id) : null,
      seller_name: sellerNames.get(file.seller_id) ?? null,
      purchaseStatus: purchaseStatusByFileId.get(file.id) ?? null,
    }));

  if (!resources.length) return null;

  return (
    <section className="container py-12 sm:py-16" aria-labelledby="recently-viewed-heading">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Clock3 className="h-4 w-4" />Your activity</p>
          <h2 id="recently-viewed-heading" className="mt-1 text-2xl font-bold tracking-tight">Recently viewed</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
        </div>
        <Link href="/search" className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex">Browse more <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <ResourceCardGrid files={resources} />
    </section>
  );
}
