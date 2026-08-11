"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(formData: FormData) {
  const fileId = String(formData.get("fileId") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!fileId) return { error: "Resource not found." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Please choose a rating from 1 to 5." };
  if (comment.length > 2000) return { error: "Review must be 2,000 characters or fewer." };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to leave a review." };

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("file_id", fileId)
    .eq("buyer_id", user.id)
    .eq("status", "completed")
    .maybeSingle();

  if (!purchase) return { error: "You can review a resource after completing its purchase." };

  const { error } = await supabase.from("reviews").upsert(
    {
      file_id: fileId,
      reviewer_id: user.id,
      purchase_id: purchase.id,
      rating,
      comment: comment || null,
    },
    { onConflict: "file_id,reviewer_id" }
  );

  if (error) return { error: "Could not save your review. Please try again." };

  revalidatePath(`/files/${fileId}`);
  revalidatePath("/trending");
  revalidatePath("/search");
  return { success: true };
}
