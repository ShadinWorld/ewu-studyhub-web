import { createAdminClient } from "@/lib/supabase/server";
import { SellerRequestCard } from "@/components/admin/seller-request-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminSellersPage() {
  const admin = createAdminClient();
  const [{ data: requests }, { count: verifiedCount }, { count: rejectedCount }] = await Promise.all([
    admin.from("profiles").select("id, full_name, university_email, student_id, student_id_document_url, seller_bkash_number, created_at").eq("student_id_verification_status", "pending").order("created_at", { ascending: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "verified").eq("is_seller", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("student_id_verification_status", "rejected"),
  ]);
  const enriched = await Promise.all((requests ?? []).map(async (r) => {
    let idCardUrl: string | null = null;
    if (r.student_id_document_url) {
      const { data } = await admin.storage.from("student-id-docs").createSignedUrl(r.student_id_document_url, 600);
      idCardUrl = data?.signedUrl ?? null;
    }
    return { ...r, idCardUrl };
  }));
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">Trust & safety</p><h2 className="text-2xl font-bold">Seller verification</h2><p className="mt-1 text-sm text-muted-foreground">Check the EWU email and student ID card before approving seller access.</p></div>
    <div className="grid grid-cols-3 gap-3"><Mini label="Pending" value={String(enriched.length)} /><Mini label="Verified sellers" value={String(verifiedCount ?? 0)} /><Mini label="Rejected" value={String(rejectedCount ?? 0)} /></div>
    <div className="space-y-4">{enriched.length ? enriched.map((r) => <SellerRequestCard key={r.id} request={r} />) : <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No pending seller requests. 🎉</CardContent></Card>}</div>
  </div>;
}
function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
