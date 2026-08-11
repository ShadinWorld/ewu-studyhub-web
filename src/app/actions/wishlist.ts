"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleWishlist(fileId: string, currentlySaved: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to save resources." };

  if (currentlySaved) {
    const { error } = await supabase.from("wishlists").delete().eq("profile_id", user.id).eq("file_id", fileId);
    if (error) return { error: "Could not remove this resource." };
  } else {
    const { error } = await supabase.from("wishlists").upsert({ profile_id: user.id, file_id: fileId });
    if (error) return { error: "Could not save this resource." };
  }

  revalidatePath("/saved");
  revalidatePath(`/files/${fileId}`);
  return { saved: !currentlySaved };
}
