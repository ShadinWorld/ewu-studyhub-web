import Link from "next/link";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFilters } from "@/components/courses/course-filters";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Courses | EWU StudyHub",
  description: "Search all EWU courses and find notes, question banks, and resources for each one.",
};

const PAGE_SIZE = 24;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { q?: string; department?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: departments }] = await Promise.all([supabase.from("departments").select("id, name").order("name")]);

  let query = supabase
    .from("courses")
    .select("id, course_code, course_name, credit, department_id", { count: "exact" })
    .order("course_code")
    .range(from, to);

  const q = searchParams.q?.trim();
  if (q) query = query.or(`course_code.ilike.%${q}%,course_name.ilike.%${q}%`);
  if (searchParams.department) query = query.eq("department_id", searchParams.department);

  const { data: courses, count } = await query;

  const departmentNameById = new Map((departments ?? []).map((d) => [d.id, d.name]));

  const courseIds = (courses ?? []).map((c) => c.id);
  const resourceCounts = new Map<string, number>();
  if (courseIds.length > 0) {
    const { data: fileRows } = await supabase
      .from("files")
      .select("course_id")
      .eq("visibility", "published")
      .in("course_id", courseIds);
    for (const row of fileRows ?? []) {
      if (!row.course_id) continue;
      resourceCounts.set(row.course_id, (resourceCounts.get(row.course_id) ?? 0) + 1);
    }
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (searchParams.department) params.set("department", searchParams.department);
    params.set("page", String(p));
    return `/courses?${params.toString()}`;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-12">
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="mt-2 text-muted-foreground">
            {count ?? 0} courses across every EWU department — search by code or name.
          </p>

          <div className="mt-6">
            <Suspense fallback={<div className="h-10 w-full max-w-2xl rounded-md border bg-muted/30" />}>
              <CourseFilters departments={departments ?? []} />
            </Suspense>
          </div>

          {(courses ?? []).length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              No courses match your search.
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {(courses ?? []).map((course, index) => (
                  <CourseCard
                    key={course.id}
                    index={index}
                    course={{
                      ...course,
                      departmentName: departmentNameById.get(course.department_id),
                      resourceCount: resourceCounts.get(course.id) ?? 0,
                    }}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
                    {page > 1 ? <Link href={pageHref(page - 1)}>Previous</Link> : <span>Previous</span>}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} asChild={page < totalPages}>
                    {page < totalPages ? <Link href={pageHref(page + 1)}>Next</Link> : <span>Next</span>}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
