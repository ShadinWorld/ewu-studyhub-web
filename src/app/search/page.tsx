import Link from "next/link";
import { Search as SearchIcon, ArrowRight, BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { InfoButton } from "@/components/ux/info-button";
import { Footer } from "@/components/layout/footer";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import { CourseCard } from "@/components/courses/course-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validations";
import { RecentSearches } from "@/components/search/recent-searches";

const PAGE_SIZE = 24;
export const metadata = { title: "Search Resources | EWU StudyHub", description: "Search EWU courses and academic resources in one place." };
function safeSearch(value: string) { return value.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100); }

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const parsed = searchQuerySchema.safeParse(searchParams);
  const params = parsed.success ? parsed.data : { q: "", page: 1 };
  const q = safeSearch(params.q ?? "");
  const exactCode = q.replace(/\s+/g, "").toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let exactCourse: { id: string; course_code: string; course_name: string; credit: number | null; department_id: string } | null = null;
  let matchedCourseIds: string[] = [];
  let matchedDepartmentIds: string[] = [];

  if (q) {
    const [{ data: exactCourses }, { data: courses }, { data: departments }] = await Promise.all([
      supabase.from("courses").select("id, course_code, course_name, credit, department_id").ilike("course_code", exactCode).limit(1),
      supabase.from("courses").select("id").or(`course_code.ilike.%${q}%,course_name.ilike.%${q}%`).limit(200),
      supabase.from("departments").select("id").or(`name.ilike.%${q}%,short_name.ilike.%${q}%`).limit(50),
    ]);
    exactCourse = exactCourses?.[0] ?? null;
    matchedCourseIds = (courses ?? []).map((row) => row.id);
    matchedDepartmentIds = (departments ?? []).map((row) => row.id);
  }

  let query = supabase
    .from("files")
    .select("id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id, published_at", { count: "exact" })
    .eq("visibility", "published")
    .order("published_at", { ascending: false });

  if (exactCourse) {
    query = query.eq("course_id", exactCourse.id);
  } else if (q) {
    const clauses = [`title.ilike.%${q}%`, `description.ilike.%${q}%`];
    if (matchedCourseIds.length) clauses.push(`course_id.in.(${matchedCourseIds.join(",")})`);
    if (matchedDepartmentIds.length) clauses.push(`department_id.in.(${matchedDepartmentIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const from = (params.page - 1) * PAGE_SIZE;
  const { data: files, count } = await query.range(from, from + PAGE_SIZE - 1);
  const courseIds = Array.from(new Set((files ?? []).map((file) => file.course_id).filter((id): id is string => Boolean(id))));
  const sellerIds = Array.from(new Set((files ?? []).map((file) => file.seller_id)));
  const [{ data: courses }, { data: sellers }] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id, course_code").in("id", courseIds) : Promise.resolve({ data: [] as { id: string; course_code: string }[] }),
    sellerIds.length ? createAdminClient().from("profiles").select("id, full_name").in("id", sellerIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  let savedIds = new Set<string>();
  const purchaseStatusByFileId = new Map<string, "pending" | "completed" | "failed" | "refunded">();
  if (user && (files ?? []).length) {
    const fileIds = (files ?? []).map((file) => file.id);
    const [{ data: saved }, { data: purchases }] = await Promise.all([
      supabase.from("wishlists").select("file_id").eq("profile_id", user.id).in("file_id", fileIds),
      supabase.from("purchases").select("file_id, status, created_at").eq("buyer_id", user.id).in("file_id", fileIds).order("created_at", { ascending: false }),
    ]);
    savedIds = new Set((saved ?? []).map((row) => row.file_id));
    for (const purchase of purchases ?? []) if (purchase.file_id && !purchaseStatusByFileId.has(purchase.file_id) && ["pending", "completed", "failed", "refunded"].includes(String(purchase.status))) purchaseStatusByFileId.set(purchase.file_id, purchase.status as "pending" | "completed" | "failed" | "refunded");
  }

  const courseCodeById = new Map((courses ?? []).map((course) => [course.id, course.course_code]));
  const sellerNameById = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));
  const resources: ResourceCardData[] = (files ?? []).map((file) => ({ ...file, course_code: file.course_id ? courseCodeById.get(file.course_id) : null, seller_name: sellerNameById.get(file.seller_id) ?? null, saved: savedIds.has(file.id), purchaseStatus: purchaseStatusByFileId.get(file.id) ?? null }));

  let exactCourseWithDepartment = exactCourse;
  if (exactCourse && exactCourse.department_id) {
    const { data: department } = await supabase.from("departments").select("name").eq("id", exactCourse.department_id).maybeSingle();
    exactCourseWithDepartment = { ...exactCourse, department_id: exactCourse.department_id, ...(department ? { departmentName: department.name } : {}) } as typeof exactCourse & { departmentName?: string };
  }

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const pageHref = (page: number) => `/search?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page) }).toString()}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8 pb-24 md:py-10 md:pb-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><SearchIcon className="h-4 w-4" />Course & resource search</div>
          <div className="flex items-center gap-3"><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find what you need faster.</h1><InfoButton slug="search_resources" title="Search ও Filter" /></div>
          <p className="mt-2 text-muted-foreground">Search one box using a course code, course name, resource title, department, or keyword.</p>
        </div>

        <form action="/search" className="mt-7 flex max-w-3xl gap-2 rounded-2xl border bg-card p-2 shadow-sm">
          <div className="relative min-w-0 flex-1"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="Try CSE303, Database Systems, notes…" className="h-11 border-0 pl-9 shadow-none focus-visible:ring-0" /></div>
          <Button type="submit" size="lg" className="h-11"><SearchIcon className="h-4 w-4" />Search</Button>
        </form>
        <RecentSearches />

        {exactCourseWithDepartment && (
          <section className="mt-8 rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-6" aria-labelledby="exact-course-match">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen className="h-4 w-4" />Exact course match</p><h2 id="exact-course-match" className="mt-1 text-lg font-bold">We found the course you were looking for.</h2></div>
              <Link href={`/course/${exactCourseWithDepartment.id}`} className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">Open course <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <CourseCard course={{ ...exactCourseWithDepartment, departmentName: (exactCourseWithDepartment as typeof exactCourse & { departmentName?: string }).departmentName, resourceCount: count ?? 0 }} />
          </section>
        )}

        <div className="mt-8 flex items-end justify-between gap-3">
          <div><p className="text-sm font-medium">{count ?? 0} resources</p><p className="text-xs text-muted-foreground">{q ? `Results for “${q}”` : "Latest published resources"}</p></div>
          {q && <Button variant="ghost" size="sm" asChild><Link href="/search">Clear</Link></Button>}
        </div>
        <div className="mt-5"><ResourceCardGrid files={resources} /></div>
        {totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={params.page <= 1} asChild={params.page > 1}>{params.page > 1 ? <Link href={pageHref(params.page - 1)}>Previous</Link> : <span>Previous</span>}</Button><span className="text-sm text-muted-foreground">Page {params.page} of {totalPages}</span><Button variant="outline" size="sm" disabled={params.page >= totalPages} asChild={params.page < totalPages}>{params.page < totalPages ? <Link href={pageHref(params.page + 1)}>Next</Link> : <span>Next</span>}</Button></div>}
      </main>
      <Footer />
    </div>
  );
}
