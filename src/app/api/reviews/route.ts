import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileId = String(formData.get("fileId") ?? "").trim();
    const rating = Number(formData.get("rating"));
    const comment = String(formData.get("comment") ?? "").trim();

    if (!fileId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 2000) {
      return NextResponse.redirect(new URL(fileId ? `/files/${fileId}` : "/", request.url));
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL(`/login?next=/files/${fileId}`, request.url));
    }

    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", fileId)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (!purchase) {
      return NextResponse.redirect(new URL(`/files/${fileId}`, request.url));
    }

    const { error } = await supabase.from("reviews").upsert(
      { file_id: fileId, reviewer_id: user.id, purchase_id: purchase.id, rating, comment: comment || null },
      { onConflict: "file_id,reviewer_id" }
    );

    if (error) {
      console.error("Review save error:", error);
    } else {
      revalidatePath(`/files/${fileId}`);
      revalidatePath("/trending");
      revalidatePath("/search");
    }

    return NextResponse.redirect(new URL(`/files/${fileId}`, request.url));
  } catch (error) {
    console.error("Review API error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
