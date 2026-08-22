import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validations";
const PAGE_SIZE = 24;
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search parameters." }, { status: 400 });
  const { q = "", page } = parsed.data;
  const queryText = q.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  const supabase = createClient();
  let matchedCourseIds: string[] = [], matchedDepartmentIds: string[] = [];
  if (queryText) {
    const [{ data: courses }, { data: departments }] = await Promise.all([
      supabase.from("courses").select("id").or(`course_code.ilike.%${queryText}%,course_name.ilike.%${queryText}%`).limit(200),
      supabase.from("departments").select("id").or(`name.ilike.%${queryText}%,short_name.ilike.%${queryText}%`).limit(50),
    ]);
    matchedCourseIds = (courses ?? []).map((r) => r.id); matchedDepartmentIds = (departments ?? []).map((r) => r.id);
  }
  let query = supabase.from("files").select("id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, category, course_id", { count: "exact" }).eq("visibility", "published").order("published_at", { ascending: false });
  if (queryText) { const clauses = [`title.ilike.%${queryText}%`, `description.ilike.%${queryText}%`]; if (matchedCourseIds.length) clauses.push(`course_id.in.(${matchedCourseIds.join(",")})`); if (matchedDepartmentIds.length) clauses.push(`department_id.in.(${matchedDepartmentIds.join(",")})`); query = query.or(clauses.join(",")); }
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) return NextResponse.json({ error: "Search failed." }, { status: 500 });
  return NextResponse.json({ results: data, total: count, page, pageSize: PAGE_SIZE });
}
