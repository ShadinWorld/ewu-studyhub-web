import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { DepartmentCard } from "@/components/departments/department-card";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Departments | EWU StudyHub",
  description: "Browse EWU StudyHub resources by department — find your program's courses and study materials.",
};

export default async function DepartmentsPage() {
  const supabase = createClient();

  // Three light queries instead of N+1 per-department counts:
  // departments (15 rows), courses.department_id (672 rows, id column only),
  // published files.department_id (id column only, filtered).
  const [{ data: departments }, { data: courseRows }, { data: fileRows }] = await Promise.all([
    supabase.from("departments").select("id, name, short_name").order("name"),
    supabase.from("courses").select("department_id"),
    supabase.from("files").select("department_id").eq("visibility", "published"),
  ]);

  const courseCounts = new Map<string, number>();
  for (const row of courseRows ?? []) {
    courseCounts.set(row.department_id, (courseCounts.get(row.department_id) ?? 0) + 1);
  }
  const resourceCounts = new Map<string, number>();
  for (const row of fileRows ?? []) {
    if (!row.department_id) continue;
    resourceCounts.set(row.department_id, (resourceCounts.get(row.department_id) ?? 0) + 1);
  }

  const departmentsWithCounts = (departments ?? []).map((d) => ({
    ...d,
    courseCount: courseCounts.get(d.id) ?? 0,
    resourceCount: resourceCounts.get(d.id) ?? 0,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-12">
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="mt-2 text-muted-foreground">
            Browse all {departmentsWithCounts.length} EWU departments and find resources for your program.
          </p>

          {departmentsWithCounts.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              No departments found.
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departmentsWithCounts.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
