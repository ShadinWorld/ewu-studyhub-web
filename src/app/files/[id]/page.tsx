import { notFound } from "next/navigation";
import Image from "next/image";
import { Star, Download, FileText, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { ReviewSection } from "@/components/reviews/review-section";

export default async function FileDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: file } = await supabase
    .from("files")
    .select(
      `id, seller_id, title, description, category, pricing_type, price_cents, thumbnail_url,
       preview_storage_path, page_count, semester, year, average_rating, reviews_count,
       downloads_count, views_count, ai_summary, ai_keywords, ai_difficulty, ai_reading_time_minutes,
       courses (course_code, course_name)`
    )
    .eq("id", params.id)
    .eq("visibility", "published")
    .single();

  if (!file) notFound();

  // Audit finding (Phase 2A): views_count/file_daily_stats.views was never
  // being incremented anywhere, even though the RPC to do it already
  // existed (0005_rpc_functions.sql) and downloads_count already used the
  // equivalent call below in the download route. Wiring it here so the
  // Trending page (added in this same phase) ranks on real view data
  // going forward. Uses the admin client + security-definer RPC, matching
  // the existing convention in api/files/[id]/download/route.ts.
  const admin = createAdminClient();
  await admin.rpc("increment_view_count", { p_file_id: params.id });

  const { data: seller } = await admin
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", file.seller_id)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyPurchased = false;
  if (user) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", params.id)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();
    alreadyPurchased = Boolean(purchase);
  }

  if (user) {
    await supabase.from("recently_viewed").upsert({ profile_id: user.id, file_id: params.id, viewed_at: new Date().toISOString() });
  }

  const isFree = file.pricing_type === "free";
  const canDownloadDirectly = isFree || alreadyPurchased;

  let previewUrl: string | null = null;
  if (!canDownloadDirectly && file.preview_storage_path) {
    const { data: pub } = supabase.storage.from("files-preview").getPublicUrl(file.preview_storage_path);
    previewUrl = pub.publicUrl;
  }
  const previewPageCount =
    file.page_count && !canDownloadDirectly
      ? Math.max(1, Math.min(file.page_count - 1, Math.ceil(file.page_count * 0.2)))
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Preview area — NEVER the full file for paid, unpurchased content */}
            <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-muted relative">
              {file.thumbnail_url ? (
                <Image src={file.thumbnail_url} alt={file.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {!canDownloadDirectly && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-sm">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {previewPageCount && file.page_count
                      ? `Preview: ${previewPageCount} of ${file.page_count} pages`
                      : "Cover, table of contents & sample pages only"}
                  </p>
                  <p className="text-xs text-muted-foreground">Purchase to unlock the full file</p>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 text-xs font-medium text-primary underline"
                    >
                      View free preview pages
                    </a>
                  )}
                </div>
              )}
            </div>

            <h1 className="mt-6 text-2xl font-bold">{file.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {file.average_rating.toFixed(1)} ({file.reviews_count} reviews)
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                {file.downloads_count} downloads
              </span>
              {file.courses && <Badge variant="secondary">{(file.courses as any).course_code}</Badge>}
              {file.semester && <Badge variant="secondary">{file.semester} {file.year}</Badge>}
            </div>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed">{file.description}</p>

            {file.ai_summary && (
              <div className="mt-6 rounded-lg border bg-accent/40 p-4">
                <p className="mb-1 text-sm font-semibold">AI-generated summary</p>
                <p className="text-sm text-muted-foreground">{file.ai_summary}</p>
              </div>
            )}
          </div>

          <div>
            <div className="sticky top-24 rounded-lg border p-6">
              <p className="text-3xl font-bold">
                {isFree ? "Free" : formatBDT(file.price_cents)}
              </p>

              <form action={`/api/files/${file.id}/download`} method="get" className="mt-4">
                <Button type="submit" className="w-full" size="lg">
                  {canDownloadDirectly ? "Download now" : `Buy for ${formatBDT(file.price_cents)}`}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3 border-t pt-4">
                {seller?.avatar_url ? (
                  <Image
                    src={seller.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted" />
                )}
                <div>
                  <p className="text-sm font-medium">{seller?.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{seller?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReviewSection fileId={file.id} />
      </main>
      <Footer />
    </div>
  );
}
