import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchQuerySchema } from "@/lib/validations";

const PAGE_SIZE = 24;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search parameters." }, { status: 400 });
  }
  const { q, courseCode, departmentId, teacherId, year, pricing, sort, page } = parsed.data;

  const supabase = createClient();
  let query = supabase
    .from("files")
    .select(
      "id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, category, courses(course_code)",
      { count: "exact" }
    )
    .eq("visibility", "published");

  if (q) query = query.textSearch("title", q, { type: "websearch" });
  if (departmentId) query = query.eq("department_id", departmentId);
  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (year) query = query.eq("year", year);
  if (pricing !== "all") query = query.eq("pricing_type", pricing);
  if (courseCode) query = query.eq("courses.course_code", courseCode);

  switch (sort) {
    case "popular":
      query = query.order("downloads_count", { ascending: false });
      break;
    case "trending":
      query = query.order("views_count", { ascending: false }); // swap for a real trending score once file_daily_stats is populated
      break;
    case "top_rated":
      query = query.order("average_rating", { ascending: false });
      break;
    default:
      query = query.order("published_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }

  return NextResponse.json({ results: data, total: count, page, pageSize: PAGE_SIZE });
}
