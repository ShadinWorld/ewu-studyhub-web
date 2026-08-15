import { createAdminClient } from "@/lib/supabase/server";
import { SellerRequestCard } from "@/components/admin/seller-request-card";

export default async function AdminSellersPage() {
  const admin = createAdminClient();
  const { data: requests } = await admin.from("profiles").select("id, full_name, university_email, student_id, student_id_document_url, seller_bkash_number, created_at").eq("student_id_verification_status", "pending").order("created_at", { ascending: true });
  const enriched = await Promise.all((requests ?? []).map(async (r) => {
    let idCardUrl: string | null = null;
    if (r.student_id_document_url) {
      const { data } = await admin.storage.from("student-id-docs").createSignedUrl(r.student_id_document_url, 600);
      idCardUrl = data?.signedUrl ?? null;
    }
    return { ...r, idCardUrl };
  }));
  if (!enriched.length) return <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">No pending seller requests.</div>;
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">{enriched.length} pending request(s)</p>{enriched.map((r) => <SellerRequestCard key={r.id} request={r} />)}</div>;
}
