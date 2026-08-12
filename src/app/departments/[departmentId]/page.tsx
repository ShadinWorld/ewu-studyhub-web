import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CourseCard } from "@/components/courses/course-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: { departmentId: string } }) {
  const supabase = createClient();
  const { data: department } = await supabase
    .from("departments")
    .select("name")
    .eq("id", params.departmentId)
    .single();
  return {
    title: department ? `${department.name} | EWU StudyHub` : "Department | EWU StudyHub",
    description: department ? `Courses and resources for ${department.name} at EWU.` : undefined,
  };
}

export default async function DepartmentCoursesPage({
  params,
  searchParams,
}: {
  params: { departmentId: string };
  searchParams: { q?: string };
}) {
  const supabase = createClient();

  const { data: department } = await supabase
    .from("departments")
    .select("id, name, short_name")
    .eq("id", params.departmentId)
    .single();

  if (!department) notFound();

  let courseQuery = supabase
    .from("courses")
    .select("id, course_code, course_name, credit")
    .eq("department_id", department.id)
    .order("course_code");

  const q = searchParams.q?.trim();
  if (q) {
    courseQuery = courseQuery.or(`course_code.ilike.%${q}%,course_name.ilike.%${q}%`);
  }

  const { data: courses } = await courseQuery;

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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-12">
          <Link href="/departments" className="text-sm text-muted-foreground hover:text-foreground">
            ← All departments
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{department.name}</h1>
          <p className="mt-2 text-muted-foreground">{(courses ?? []).length} courses in this department</p>

          <form className="relative mt-6 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q ?? ""} placeholder="Search course code or name…" className="pl-9" />
          </form>

          {(courses ?? []).length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed py-16 text-center text-muted-foreground">
              {q ? `No courses match "${q}".` : "No courses found for this department yet."}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(courses ?? []).map((course, index) => (
                <CourseCard
                  key={course.id}
                  index={index}
                  course={{ ...course, resourceCount: resourceCounts.get(course.id) ?? 0 }}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
