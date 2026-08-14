import { createClient } from "@/lib/supabase/server";
import { SellerRequestCard } from "@/components/admin/seller-request-card";

export default async function AdminSellersPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("profiles")
    .select("id, full_name, university_email, student_id, seller_bkash_number, created_at")
    .eq("student_id_verification_status", "pending")
    .order("created_at", { ascending: true });

  if (!requests || requests.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        No pending seller requests.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{requests.length} pending request(s)</p>
      {requests.map((r) => (
        <SellerRequestCard key={r.id} request={r} />
      ))}
    </div>
  );
}
