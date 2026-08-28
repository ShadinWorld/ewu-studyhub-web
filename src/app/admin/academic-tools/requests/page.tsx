import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResourceRequestDetails } from "@/components/admin/resource-request-details";
import { updateRequestStatus } from "../actions";

export default async function ResourceRequestsAdminPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const admin = createAdminClient();
  const { data: requests } = await admin
    .from("resource_requests")
    .select("id,title,status,details,admin_note,created_at,user_id,course_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const requestUserIds = Array.from(new Set((requests ?? []).map((r) => r.user_id)));
  const requestCourseIds = Array.from(new Set((requests ?? []).map((r) => r.course_id).filter((x): x is string => Boolean(x))));
  const requestIds = (requests ?? []).map((r) => r.id);

  const [{ data: requestProfiles }, { data: requestCourses }, { data: historyRows }] = await Promise.all([
    requestUserIds.length ? admin.from("profiles").select("id,full_name").in("id", requestUserIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    requestCourseIds.length ? admin.from("courses").select("id,course_code").in("id", requestCourseIds) : Promise.resolve({ data: [] as { id: string; course_code: string }[] }),
    requestIds.length
      ? admin.from("user_activity_history").select("id,entity_id,action,description,created_at").eq("entity_type", "resource_request").in("entity_id", requestIds).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; entity_id: string; action: string; description: string | null; created_at: string }[] }),
  ]);

  const profileMap = new Map((requestProfiles ?? []).map((p) => [p.id, p.full_name]));
  const requestCourseMap = new Map((requestCourses ?? []).map((c) => [c.id, c.course_code]));
  const historyMap = (historyRows ?? []).reduce<Record<string, typeof historyRows>>((acc, row) => {
    if (!row.entity_id) return acc;
    (acc[row.entity_id] ??= []).push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Academic Tools & Updates</Link>
        <p className="mt-3 text-sm font-semibold text-primary">Student experience</p>
        <h2 className="text-2xl font-bold">Resource requests</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open and in-progress requests stay above. Fulfilled or closed requests move into History below and can still be reopened.</p>
        {searchParams?.saved ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileQuestion className="h-5 w-5 text-primary" />Requests</CardTitle></CardHeader>
        <CardContent>
          <ResourceRequestDetails
            requests={(requests ?? []) as any}
            profileMap={Object.fromEntries(profileMap)}
            courseMap={Object.fromEntries(requestCourseMap)}
            historyMap={historyMap as any}
            updateRequestStatus={updateRequestStatus}
            returnTo="/admin/academic-tools/requests"
          />
        </CardContent>
      </Card>
    </div>
  );
}
