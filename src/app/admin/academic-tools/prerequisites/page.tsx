import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addPrerequisite, deletePrerequisite } from "./actions";

export default async function PrerequisitesAdminPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const admin = createAdminClient();
  const [{ data: courses }, { data: mappings }] = await Promise.all([
    admin.from("courses").select("id,course_code,course_name").order("course_code").limit(2000),
    admin.from("course_prerequisites").select("course_id,prerequisite_course_id,created_at").order("created_at", { ascending: false }).limit(2000),
  ]);

  const courseMap = new Map((courses ?? []).map((course) => [course.id, `${course.course_code} — ${course.course_name}`]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Academic Tools & Updates
        </Link>
        <p className="mt-3 text-sm font-semibold text-primary">Student experience</p>
        <h2 className="text-2xl font-bold">Prerequisite Checker Management</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Add or remove course prerequisite mappings used by the Student Prerequisite Checker.</p>
        {searchParams?.saved ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" />Add prerequisite</CardTitle></CardHeader>
        <CardContent>
          <form action={addPrerequisite} className="grid gap-4 sm:grid-cols-2">
            <select name="course_id" required className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Course that needs a prerequisite</option>
              {(courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
            </select>
            <select name="prerequisite_course_id" required className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Required prerequisite course</option>
              {(courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.course_code} — {course.course_name}</option>)}
            </select>
            <Button type="submit" className="sm:col-span-2">Add prerequisite</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current prerequisite mappings</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(mappings ?? []).map((mapping) => (
            <div key={`${mapping.course_id}-${mapping.prerequisite_course_id}`} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{courseMap.get(mapping.course_id) ?? mapping.course_id}</p>
                <p className="mt-1 text-muted-foreground">Requires: {courseMap.get(mapping.prerequisite_course_id) ?? mapping.prerequisite_course_id}</p>
              </div>
              <form action={deletePrerequisite}>
                <input type="hidden" name="course_id" value={mapping.course_id} />
                <input type="hidden" name="prerequisite_course_id" value={mapping.prerequisite_course_id} />
                <Button type="submit" size="sm" variant="destructive">Remove</Button>
              </form>
            </div>
          ))}
          {!mappings?.length ? <p className="py-8 text-center text-sm text-muted-foreground">No prerequisite mappings have been configured yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
