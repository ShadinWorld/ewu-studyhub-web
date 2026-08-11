import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FileText, Download, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import { ResourceFilters } from "@/components/files/resource-filters";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ResourceCategory } from "@/types/database.types";

export async function generateMetadata({ params }: { params: { courseId: string } }) {
  const supabase = createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("course_code, course_name")
    .eq("id", params.courseId)
    .single();
  return {
    title: course ? `${course.course_code} ${course.course_name} Resources | EWU StudyHub` : "Course | EWU StudyHub",
    description: course
      ? `Notes, question banks, and resources for ${course.course_code} - ${course.course_name} at EWU.`
      : undefined,
  };
}

interface CourseFiltersParams {
  category?: string;
  year?: string;
  semester?: string;
  pricing?: string;
  sort?: string;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: { courseId: string };
  searchParams: CourseFiltersParams;
}) {
  const supabase = createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, course_code, course_name, credit, department_id")
    .eq("id", params.courseId)
    .single();

  if (!course) notFound();

  const { data: department } = await supabase
    .from("departments")
    .select("id, name")
    .eq("id", course.department_id)
    .single();

  let query = supabase
    .from("files")
    .select(
      "id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, category, year, semester, seller_id"
    )
    .eq("course_id", course.id)
    .eq("visibility", "published");

  if (searchParams.category) query = query.eq("category", searchParams.category as ResourceCategory);
  if (searchParams.year) query = query.eq("year", Number(searchParams.year));
  if (searchParams.semester) query = query.eq("semester", searchParams.semester);
  if (searchParams.pricing) query = query.eq("pricing_type", searchParams.pricing as "free" | "paid");

  switch (searchParams.sort) {
    case "popular":
      query = query.order("views_count", { ascending: false });
      break;
    case "downloads":
      query = query.order("downloads_count", { ascending: false });
      break;
    case "rating":
      query = query.order("average_rating", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data: files } = await query;

  // Resolve seller names in bulk (no reliance on a specific FK constraint name for embedding).
  const sellerIds = Array.from(new Set((files ?? []).map((f) => f.seller_id)));
  const sellerNameById = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: sellers } = await createAdminClient().from("profiles").select("id, full_name").in("id", sellerIds);
    for (const s of sellers ?? []) sellerNameById.set(s.id, s.full_name);
  }

  const resources: ResourceCardData[] = (files ?? []).map((f) => ({
    ...f,
    course_code: course.course_code,
    seller_name: sellerNameById.get(f.seller_id) ?? null,
  }));

  // Years for the filter dropdown - derived from all published resources for this course
  // (unfiltered), not just the current filtered result set.
  const { data: yearRows } = await supabase
    .from("files")
    .select("year")
    .eq("course_id", course.id)
    .eq("visibility", "published")
    .not("year", "is", null);
  const years = Array.from(new Set((yearRows ?? []).map((r) => r.year).filter((y): y is number => y != null))).sort(
    (a, b) => b - a
  );

  const totalDownloads = resources.reduce((sum, r) => sum + r.downloads_count, 0);
  const ratedResources = resources.filter((r) => r.reviews_count > 0);
  const avgRating =
    ratedResources.length > 0
      ? ratedResources.reduce((sum, r) => sum + r.average_rating, 0) / ratedResources.length
      : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="border-b bg-muted/30">
          <div className="container py-10">
            {department && (
              <Link href={`/departments/${department.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                ← {department.name}
              </Link>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{course.course_code}</h1>
              {course.credit != null && <Badge variant="secondary">{course.credit} Credits</Badge>}
            </div>
            <p className="mt-1 text-lg text-muted-foreground">{course.course_name}</p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <strong>{resources.length}</strong>
                <span className="text-muted-foreground">Resources</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4 text-primary" />
                <strong>{totalDownloads}</strong>
                <span className="text-muted-foreground">Downloads</span>
              </span>
              {avgRating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <strong>{avgRating.toFixed(1)}</strong>
                  <span className="text-muted-foreground">Average rating</span>
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="container py-8">
          <Suspense fallback={<div className="h-24 w-full rounded-md border bg-muted/30" />}>
            <ResourceFilters years={years} />
          </Suspense>

          <div className="mt-6">
            <ResourceCardGrid files={resources} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
