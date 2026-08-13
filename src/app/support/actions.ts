"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupportTicketCategory } from "@/types/database.types";

const categories = new Set(["suggestion", "complaint", "general", "payment", "resource", "seller", "account", "purchase"]);

export async function createSupportTicket(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in before sending a support request.");

  const category = String(formData.get("category") ?? "general").trim();
  const message = String(formData.get("message") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const pagePath = String(formData.get("page_path") ?? "/support").trim().slice(0, 300);

  if (!categories.has(category)) throw new Error("Invalid support category.");
  const ticketCategory = category as SupportTicketCategory;
  if (message.length < 3) throw new Error("Please write at least a few words.");
  if (message.length > 5000) throw new Error("Message is too long.");

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    category: ticketCategory,
    subject,
    message,
    page_path: pagePath,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/support");
  revalidatePath("/admin/support");
}
