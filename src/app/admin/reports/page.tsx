import { createClient } from "@/lib/supabase/server";
import { ReportReviewCard } from "@/components/admin/report-review-card";

export default async function ReportsPage() {
  const supabase = createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select(
      `id, reason, details, status, created_at,
       file:files (id, title),
       reporter:profiles!reports_reporter_id_fkey (full_name)`
    )
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (!reports || reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
        No open reports. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{reports.length} open report(s)</p>
      {reports.map((r: any) => (
        <ReportReviewCard key={r.id} report={r} />
      ))}
    </div>
  );
}
