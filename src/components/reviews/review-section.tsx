import { Star } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`${size} ${index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

export async function ReviewSection({ fileId }: { fileId: string }) {
  const supabase = createClient();
  const [{ data: { user } }, { data: reviews }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("reviews").select("id, reviewer_id, rating, comment, created_at").eq("file_id", fileId).order("created_at", { ascending: false }),
  ]);

  const reviewerIds = Array.from(new Set((reviews ?? []).map((review) => review.reviewer_id)));
  const { data: profiles } = reviewerIds.length
    ? await createAdminClient().from("profiles").select("id, full_name, avatar_url").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  let existingReview: { rating: number; comment: string | null } | null = null;
  let canReview = false;

  if (user) {
    const [review, purchase] = await Promise.all([
      supabase.from("reviews").select("rating, comment").eq("file_id", fileId).eq("reviewer_id", user.id).maybeSingle(),
      supabase.from("purchases").select("id").eq("file_id", fileId).eq("buyer_id", user.id).eq("status", "completed").maybeSingle(),
    ]);
    existingReview = review.data;
    canReview = Boolean(purchase.data);
  }

  return (
    <section className="mt-10 border-t pt-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">Student feedback</p>
          <h2 id="reviews-heading" className="mt-1 text-2xl font-bold">Reviews & ratings</h2>
          <p className="mt-1 text-sm text-muted-foreground">See what other EWU students thought about this resource.</p>
        </div>
        <span className="text-sm text-muted-foreground">{reviews?.length ?? 0} reviews</span>
      </div>

      {user && canReview && (
        <form action="/api/reviews" method="post" className="mt-6 rounded-xl border bg-muted/20 p-5">
          <input type="hidden" name="fileId" value={fileId} />
          <div>
            <p className="text-sm font-semibold">{existingReview ? "Update your review" : "Leave a review"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Your review helps other students choose useful resources.</p>
          </div>
          <div className="mt-4">
            <fieldset>
              <legend className="text-sm font-medium">Rating</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="rating" value={value} defaultChecked={existingReview?.rating === value} className="sr-only" required />
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <label className="mt-4 block text-sm font-medium" htmlFor="review-comment">Comment <span className="font-normal text-muted-foreground">(optional)</span></label>
          <textarea id="review-comment" name="comment" defaultValue={existingReview?.comment ?? ""} maxLength={2000} rows={4} placeholder="What was useful about this resource?" className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="mt-3 flex justify-end"><Button type="submit">{existingReview ? "Update review" : "Submit review"}</Button></div>
        </form>
      )}

      {!user && <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Log in after purchasing this resource to leave a review.</p>}
      {user && !canReview && <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Complete the purchase to leave a verified review.</p>}

      <div className="mt-6 space-y-4">
        {(reviews ?? []).map((review) => {
          const profile = profileById.get(review.reviewer_id);
          return (
            <article key={review.id} className="rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{profile?.full_name || "EWU Student"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}</p>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.comment && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.comment}</p>}
            </article>
          );
        })}
        {(reviews ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Star className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No reviews yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first verified buyer to share your experience.</p>
          </div>
        )}
      </div>
    </section>
  );
}
