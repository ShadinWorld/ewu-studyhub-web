import Link from "next/link";
import { Search as SearchIcon, SlidersHorizontal, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import { SearchFilters } from "@/components/search/search-filters";
import { Button } from "@/components/ui/button";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validations";
import type { ResourceCategory } from "@/types/database.types";

const PAGE_SIZE = 24;

export const metadata = {
  title: "Search Resources | EWU StudyHub",
  description: "Search EWU notes, question banks, assignments, slides, projects, and more.",
};

function safeFilterValue(value: string) {
  return value.replace(/[(),%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const parsed = searchQuerySchema.safeParse(searchParams);
  const params = parsed.success
    ? parsed.data
    : { q: "", courseCode: "", departmentId: undefined, teacherId: undefined, year: undefined, pricing: "all" as const, sort: "newest" as const, page: 1 };

  const category = searchParams.category && searchParams.category in {
    notes: true, quiz_questions: true, mid_questions: true, final_questions: true,
    assignment: true, lab_report: true, project: true, presentation_slide: true, research_report: true,
  } ? searchParams.category as ResourceCategory : "";

  const supabase = createClient();
  const [{ data: departments }, { data: { user } }] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase.auth.getUser(),
  ]);

  let query = supabase
    .from("files")
    .select("id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id, published_at", { count: "exact" })
    .eq("visibility", "published");

  if (params.departmentId) query = query.eq("department_id", params.departmentId);
  if (params.teacherId) query = query.eq("teacher_id", params.teacherId);
  if (params.year) query = query.eq("year", params.year);
  if (params.pricing !== "all") query = query.eq("pricing_type", params.pricing);
  if (category) query = query.eq("category", category);

  const q = safeFilterValue(params.q ?? "");
  const courseCode = safeFilterValue(params.courseCode ?? "");
  let matchedCourseIds: string[] = [];

  if (q || courseCode) {
    let courseQuery = supabase.from("courses").select("id");
    if (courseCode) courseQuery = courseQuery.ilike("course_code", `%${courseCode}%`);
    else courseQuery = courseQuery.or(`course_code.ilike.%${q}%,course_name.ilike.%${q}%`);
    const { data: courses } = await courseQuery.limit(100);
    matchedCourseIds = (courses ?? []).map((course) => course.id);
  }

  if (courseCode) {
    if (matchedCourseIds.length === 0) query = query.eq("course_id", "00000000-0000-0000-0000-000000000000");
    else query = query.in("course_id", matchedCourseIds);
  } else if (q) {
    const clauses = [`title.ilike.%${q}%`];
    if (matchedCourseIds.length > 0) clauses.push(`course_id.in.(${matchedCourseIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  switch (params.sort) {
    case "popular": query = query.order("downloads_count", { ascending: false }); break;
    case "trending": query = query.order("views_count", { ascending: false }); break;
    case "top_rated": query = query.order("average_rating", { ascending: false }).order("reviews_count", { ascending: false }); break;
    default: query = query.order("published_at", { ascending: false });
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
    for (const purchase of purchases ?? []) {
      if (purchase.file_id && !purchaseStatusByFileId.has(purchase.file_id) && ["pending", "completed", "failed", "refunded"].includes(String(purchase.status))) {
        purchaseStatusByFileId.set(purchase.file_id, purchase.status as "pending" | "completed" | "failed" | "refunded");
      }
    }
  }

  const courseCodeById = new Map((courses ?? []).map((course) => [course.id, course.course_code]));
  const sellerNameById = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));
  const resources: ResourceCardData[] = (files ?? []).map((file) => ({
    ...file,
    course_code: file.course_id ? courseCodeById.get(file.course_id) : null,
    seller_name: sellerNameById.get(file.seller_id) ?? null,
    saved: savedIds.has(file.id),
    purchaseStatus: purchaseStatusByFileId.get(file.id) ?? null,
  }));

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const hasQuery = Boolean(params.q || params.courseCode || params.departmentId || category || params.pricing !== "all");
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.courseCode) next.set("courseCode", params.courseCode);
    if (params.departmentId) next.set("departmentId", params.departmentId);
    if (category) next.set("category", category);
    if (params.pricing !== "all") next.set("pricing", params.pricing);
    if (params.sort !== "newest") next.set("sort", params.sort);
    next.set("page", String(page));
    return `/search?${next.toString()}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8 pb-24 md:py-10 md:pb-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" />
            Course-first discovery
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Find the right resource faster.</h1>
          <p className="mt-2 text-muted-foreground">Search by course, resource title, department, or type. Everything stays tied to the EWU course catalog.</p>
        </div>

        <div className="mt-7">
          <SearchFilters
            departments={departments ?? []}
            values={{ q: params.q ?? "", courseCode: params.courseCode ?? "", departmentId: params.departmentId ?? "", pricing: params.pricing, sort: params.sort, category }}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{count ?? 0} resources</p>
            <p className="text-xs text-muted-foreground">{hasQuery ? "Matching your current filters" : "Latest published resources"}</p>
          </div>
          {hasQuery && <Button variant="ghost" size="sm" asChild><Link href="/search"><SlidersHorizontal className="h-4 w-4" />Clear filters</Link></Button>}
        </div>

        <div className="mt-5">
          <ResourceCardGrid files={resources} />
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={params.page <= 1} asChild={params.page > 1}>
              {params.page > 1 ? <Link href={pageHref(params.page - 1)}>Previous</Link> : <span>Previous</span>}
            </Button>
            <span className="text-sm text-muted-foreground">Page {params.page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={params.page >= totalPages} asChild={params.page < totalPages}>
              {params.page < totalPages ? <Link href={pageHref(params.page + 1)}>Next</Link> : <span>Next</span>}
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
