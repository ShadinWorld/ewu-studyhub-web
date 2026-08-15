import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { reviewId } = await request.json();
    if (typeof reviewId !== "string" || !reviewId) return NextResponse.json({ error: "Invalid review." }, { status: 400 });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    const admin = createAdminClient();
    const { data: review } = await admin.from("reviews").select("id, helpful_votes").eq("id", reviewId).maybeSingle();
    if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
    const { data: existing } = await admin.from("review_votes").select("review_id").eq("review_id", reviewId).eq("voter_id", user.id).maybeSingle();
    if (existing) {
      await admin.from("review_votes").delete().eq("review_id", reviewId).eq("voter_id", user.id);
      const helpfulVotes = Math.max(0, (review.helpful_votes ?? 0) - 1);
      await admin.from("reviews").update({ helpful_votes: helpfulVotes }).eq("id", reviewId);
      return NextResponse.json({ voted: false, helpfulVotes });
    }
    await admin.from("review_votes").insert({ review_id: reviewId, voter_id: user.id });
    const helpfulVotes = (review.helpful_votes ?? 0) + 1;
    await admin.from("reviews").update({ helpful_votes: helpfulVotes }).eq("id", reviewId);
    return NextResponse.json({ voted: true, helpfulVotes });
  } catch (error) {
    console.error("Helpful vote error:", error);
    return NextResponse.json({ error: "Could not update helpful vote." }, { status: 500 });
  }
}
