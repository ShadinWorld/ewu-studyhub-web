import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceRequestDetails } from "@/components/admin/resource-request-details";
import { updateRequestStatus } from "@/app/admin/academic-tools/actions";

export default async function StudentToolResourceRequestsPage() {
  const admin = createAdminClient();
  const [{ data: requests }, { data: profiles }] = await Promise.all([
    admin.from("resource_requests").select("id,title,status,details,admin_note,created_at,user_id,course_id").order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id,full_name"),
  ]);
  const courseIds = Array.from(new Set((requests ?? []).map((r) => r.course_id).filter((id): id is string => Boolean(id))));
  const { data: courses } = courseIds.length ? await admin.from("courses").select("id,course_code").in("id", courseIds) : { data: [] as { id: string; course_code: string }[] };
  const requestIds = (requests ?? []).map((r) => r.id);
  const { data: historyRows } = requestIds.length
    ? await admin.from("user_activity_history").select("id,entity_id,action,description,created_at,metadata").eq("entity_type", "resource_request").in("entity_id", requestIds).order("created_at", { ascending: true })
    : { data: [] as any[] };
  const historyMap = (historyRows ?? []).reduce<Record<string, any[]>>((acc, row) => { (acc[row.entity_id] ??= []).push(row); return acc; }, {});
  return <div className="space-y-6">
    <div>
      <p className="text-sm font-semibold text-primary">Student Tools</p>
      <h2 className="text-2xl font-bold">Resource Requests</h2>
      <p className="mt-1 text-sm text-muted-foreground">Review student resource requests without leaving the Student Tools section.</p>
      <Link href="/admin" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">Back to Admin</Link>
    </div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileQuestion className="h-5 w-5 text-primary"/>Requests</CardTitle></CardHeader><CardContent>
      <ResourceRequestDetails
        requests={(requests ?? []) as any}
        profileMap={Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? "Student"]))}
        courseMap={Object.fromEntries((courses ?? []).map((c) => [c.id, c.course_code]))}
        historyMap={historyMap}
        updateRequestStatus={updateRequestStatus}
        returnTo="/admin/student-tools/resource-requests"
      />
    </CardContent></Card>
  </div>;
}
