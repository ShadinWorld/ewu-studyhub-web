"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportReason } from "@/types/database.types";

export async function createResourceReport(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in to report a resource.");
  const fileId = String(formData.get("file_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "other").trim();
  const details = String(formData.get("details") ?? "").trim();
  if (!fileId || details.length < 3) throw new Error("Please provide the resource and a short explanation.");
  const allowed = new Set(["wrong_course", "fake_file", "duplicate", "blank_pdf", "copyright", "spam", "other"]);
  if (!allowed.has(reason)) throw new Error("Invalid report reason.");
  const reportReason = reason as ReportReason;

  const { error } = await supabase.from("reports").insert({ file_id: fileId, reporter_id: user.id, reason: reportReason, details });
  if (error) throw new Error(error.message);
  revalidatePath(`/files/${fileId}`);
  revalidatePath("/admin/reports");
}
