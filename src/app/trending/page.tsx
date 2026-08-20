import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Trending | EWU StudyHub",
  description: "The most popular notes, question banks, and resources on EWU StudyHub right now.",
};

// Ranking algorithm (documented per the "explain before implementing" instruction):
//
// score = downloads_count * 3 + views_count * 1 + (average_rating * reviews_count) * 2
//
// - downloads_count is weighted highest: it's the strongest real signal of
//   value (someone paid attention AND followed through), and it's been
//   tracked correctly since the file was published (increment_download_count
//   is called on every real download - confirmed in this session's audit).
// - views_count is weighted lowest: it only just started being tracked in
//   this same change (increment_view_count was defined but never called
//   before now), so older files will under-count views relative to
//   downloads/ratings until it accumulates. Weighting it lowest keeps a
//   newly-viewed-but-not-yet-downloaded file from outranking genuinely
//   popular ones purely on a metric that's still "catching up".
// - (average_rating * reviews_count) rewards files with both a high rating
//   AND enough reviews to trust it (a single 5-star review scores lower
//   than 4.5 average across 10 reviews) - a simple, defensible proxy for
//   "quality popularity" without needing a separate Bayesian-average query.
//
// This runs in application code (not a DB view) because the candidate set
// is currently small (few hundred published files) - fine for now, but if
// the catalog grows into the thousands this should move to a Postgres
// function/materialized view instead of fetching all published files.
function scoreOf(f: Pick<ResourceCardData, "downloads_count" | "average_rating" | "reviews_count"> & { views_count: number }) {
  return f.downloads_count * 3 + f.views_count * 1 + f.average_rating * f.reviews_count * 2;
}

export default async function TrendingPage() {
  const supabase = createClient();

  const { data: files } = await supabase
    .from("files")
    .select(
      "id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, seller_id, course_id"
    )
    .eq("visibility", "published");

  const ranked = (files ?? [])
    .slice()
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, 40);

  const courseIds = Array.from(new Set(ranked.map((f) => f.course_id).filter((id): id is string => id != null)));
  const sellerIds = Array.from(new Set(ranked.map((f) => f.seller_id)));

  const [{ data: courses }, { data: sellers }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("courses").select("id, course_code").in("id", courseIds)
      : Promise.resolve({ data: [] as { id: string; course_code: string }[] }),
    sellerIds.length > 0
      ? createAdminClient().from("profiles").select("id, full_name").in("id", sellerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const courseCodeById = new Map((courses ?? []).map((c) => [c.id, c.course_code]));
  const sellerNameById = new Map((sellers ?? []).map((s) => [s.id, s.full_name]));

  const resources: ResourceCardData[] = ranked.map((f) => ({
    ...f,
    course_code: f.course_id ? courseCodeById.get(f.course_id) : null,
    seller_name: sellerNameById.get(f.seller_id) ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-12">
          <h1 className="text-3xl font-bold tracking-tight">Trending</h1>
          <p className="mt-2 text-muted-foreground">
            The most downloaded, viewed, and highly-rated resources on EWU StudyHub.
          </p>

          <div className="mt-8">
            <ResourceCardGrid files={resources} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
