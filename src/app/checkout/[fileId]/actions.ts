"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function submitBkashPayment(formData: FormData): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fileId = String(formData.get("fileId") ?? "").trim();
  const senderNumber = String(
    formData.get("buyer_bkash_number") ?? ""
  ).trim();
  const transactionId = String(
    formData.get("payment_reference") ?? ""
  ).trim();

  if (!fileId) {
    throw new Error("Resource not found.");
  }

  if (!user) {
    redirect(`/login?next=/checkout/${fileId}`);
  }

  if (!/^01\d{9}$/.test(senderNumber)) {
    throw new Error("Enter a valid 11-digit bKash number.");
  }

  if (transactionId.length > 100) {
    throw new Error("Transaction ID is too long.");
  }

  const { data: file } = await supabase
    .from("files")
    .select("id, title, price_cents, pricing_type, seller_id, visibility")
    .eq("id", fileId)
    .eq("visibility", "published")
    .single();

  if (!file || file.pricing_type !== "paid") {
    throw new Error("Resource is not available for purchase.");
  }

  if (file.seller_id === user.id) {
    throw new Error("You cannot purchase your own resource.");
  }

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("file_id", file.id)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "completed"])
    .maybeSingle();

  if (existing?.status === "completed" || existing?.status === "pending") {
    redirect(`/checkout/${fileId}`);
  }

  const invoice = `EWU-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${crypto
    .randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;

  const { error } = await supabase.from("purchases").insert({
    buyer_id: user.id,
    file_id: file.id,
    amount_cents: file.price_cents,
    commission_cents: 0,
    seller_earning_cents: 0,
    status: "pending",
    payment_method: "bkash",
    payment_reference: transactionId,
    buyer_bkash_number: senderNumber,
    payment_submitted_at: new Date().toISOString(),
    invoice_number: invoice,
  });

  if (error) {
    console.error("bKash payment submission error:", error);
    throw new Error("Unable to submit payment. Please try again.");
  }

  const admin = createAdminClient();
  await admin.from("notifications").insert([
    {
      profile_id: user.id,
      type: "purchase_pending",
      title: "Purchase request submitted",
      body: `\"${file.title}\" payment was submitted for admin review. Your request will stay here until it is approved or rejected.`,
      link: `/requests`,
    },
    {
      profile_id: file.seller_id,
      type: "purchase_pending",
      title: "New purchase request",
      body: `A buyer submitted a purchase request for \"${file.title}\". Admin is reviewing the payment.`,
      link: `/requests`,
    },
  ]);

  revalidatePath(`/checkout/${fileId}`);
  revalidatePath(`/files/${fileId}`);
  revalidatePath("/purchases");
  revalidatePath("/admin/payments");

  redirect(`/checkout/${fileId}`);
}
