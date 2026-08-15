import { Star } from "lucide-react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ReviewHelpfulButton } from "@/components/reviews/review-helpful-button";

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`${size} ${index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}</span>;
}

export async function ReviewSection({ fileId }: { fileId: string }) {
  const supabase = createClient();
  const [{ data: { user } }, { data: reviews }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("reviews").select("id, reviewer_id, purchase_id, rating, comment, helpful_votes, created_at").eq("file_id", fileId).order("created_at", { ascending: false }),
  ]);
  const reviewerIds = Array.from(new Set((reviews ?? []).map((review) => review.reviewer_id)));
  const [{ data: profiles }, { data: votes }] = await Promise.all([
    reviewerIds.length ? createAdminClient().from("profiles").select("id, full_name, avatar_url, student_id_verification_status, university_email_verified").in("id", reviewerIds) : Promise.resolve({ data: [] as any[] }),
    user && reviews?.length ? supabase.from("review_votes").select("review_id").eq("voter_id", user.id) : Promise.resolve({ data: [] as any[] }),
  ]);
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const votedIds = new Set((votes ?? []).map((vote) => vote.review_id));
  const ratingCounts = [5,4,3,2,1].map((rating) => ({ rating, count: (reviews ?? []).filter((review) => review.rating === rating).length }));
  const totalReviews = reviews?.length ?? 0;
  const average = totalReviews ? (reviews ?? []).reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;
  const recommendationRate = totalReviews ? Math.round(((reviews ?? []).filter((review) => review.rating >= 4).length / totalReviews) * 100) : 0;
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
  const sortedReviews = [...(reviews ?? [])].sort((a, b) => (b.helpful_votes - a.helpful_votes) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

  return <section className="mt-10 border-t pt-8" aria-labelledby="reviews-heading">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Student feedback</p><h2 id="reviews-heading" className="mt-1 text-2xl font-bold">Reviews & ratings</h2><p className="mt-1 text-sm text-muted-foreground">Verified buyers can share feedback to help other EWU students.</p></div><span className="text-sm text-muted-foreground">{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</span></div>

    <div className="mt-6 grid gap-5 rounded-2xl border bg-card p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
      <div className="flex flex-col items-center justify-center rounded-xl bg-muted/30 p-5 text-center"><p className="text-4xl font-bold">{average.toFixed(1)}</p><Stars rating={Math.round(average)} size="h-4 w-4" /><p className="mt-2 text-xs text-muted-foreground">Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}</p>{totalReviews > 0 && <p className="mt-2 text-xs font-semibold text-primary">{recommendationRate}% would recommend</p>}</div>
      <div className="space-y-2.5">{ratingCounts.map(({ rating, count }) => { const width = totalReviews ? Math.round((count / totalReviews) * 100) : 0; return <div key={rating} className="flex items-center gap-2 text-xs"><span className="w-8 font-medium">{rating} ★</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} /></div><span className="w-6 text-right text-muted-foreground">{count}</span></div>; })}</div>
    </div>

    {user && canReview && <form action="/api/reviews" method="post" className="mt-6 rounded-2xl border bg-muted/10 p-5 sm:p-6"><input type="hidden" name="fileId" value={fileId} /><div><p className="text-sm font-semibold">{existingReview ? "Update your review" : "Leave a review"}</p><p className="mt-1 text-xs text-muted-foreground">Verified purchase • Your feedback helps other students choose useful resources.</p></div><fieldset className="mt-4"><legend className="text-sm font-medium">Rating</legend><div className="mt-2 flex flex-wrap gap-2">{[1,2,3,4,5].map((value) => <label key={value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name="rating" value={value} defaultChecked={existingReview?.rating === value} className="sr-only" required /><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{value}</label>)}</div></fieldset><label className="mt-4 block text-sm font-medium" htmlFor="review-comment">Comment <span className="font-normal text-muted-foreground">(optional)</span></label><textarea id="review-comment" name="comment" defaultValue={existingReview?.comment ?? ""} maxLength={500} rows={4} placeholder="What was useful about this resource?" className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /><p className="mt-1 text-right text-[11px] text-muted-foreground">Maximum 500 characters</p><div className="mt-3 flex justify-end"><Button type="submit">{existingReview ? "Update review" : "Submit review"}</Button></div></form>}
    {!user && <p className="mt-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Log in after purchasing this resource to leave a verified review.</p>}
    {user && !canReview && <p className="mt-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Complete the purchase to leave a verified review.</p>}

    <div className="mt-6 space-y-4">{sortedReviews.map((review) => { const profile = profileById.get(review.reviewer_id); const verified = Boolean(review.purchase_id) || profile?.student_id_verification_status === "verified" || profile?.university_email_verified; return <article key={review.id} className="rounded-2xl border bg-card p-5"><div className="flex gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-bold">EWU</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-sm font-semibold">{profile?.full_name || "EWU Student"}{verified && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Verified purchase</span>}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}</p></div><Stars rating={review.rating} /></div>{review.comment && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.comment}</p>}<div className="mt-4 flex items-center justify-between gap-3 border-t pt-3"><p className="text-xs text-muted-foreground">Was this helpful?</p><ReviewHelpfulButton reviewId={review.id} initialVotes={review.helpful_votes} initiallyVoted={votedIds.has(review.id)} /></div></div></div></article>; })}{!totalReviews && <div className="rounded-2xl border border-dashed p-10 text-center"><Star className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No reviews yet</p><p className="mt-1 text-sm text-muted-foreground">Be the first verified buyer to share your experience.</p></div>}</div>
  </section>;
}
