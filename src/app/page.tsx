import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Search,
  Sparkles,
  ShoppingBag,
  Bookmark,
  LayoutDashboard,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResourceCardGrid,
  type ResourceCardData,
} from "@/components/files/resource-card";
import { DepartmentCard } from "@/components/departments/department-card";
import { CourseCard } from "@/components/courses/course-card";
import { RecentlyViewed } from "@/components/files/recently-viewed";
import { SavedResources } from "@/components/files/saved-resources";
import { FAQSection } from "@/components/faq/faq-section";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SupportFormCard } from "@/components/support/support-form";

/* -------------------------------------------------------------------------- */
/* Trending Resources                                                         */
/* -------------------------------------------------------------------------- */

async function TrendingFiles() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: files } = await supabase
    .from("files")
    .select(
      "id, title, thumbnail_url, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id"
    )
    .eq("visibility", "published")
    .order("downloads_count", { ascending: false })
    .limit(8);

  if (!files?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No resources available yet.
      </p>
    );
  }

  const courseIds = Array.from(
    new Set(
      files
        .map((file) => file.course_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const sellerIds = Array.from(
    new Set(
      files
        .map((file) => file.seller_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [
    { data: courses },
    { data: sellers },
  ] = await Promise.all([
    courseIds.length
      ? supabase
          .from("courses")
          .select("id, course_code")
          .in("id", courseIds)
      : Promise.resolve({
          data: [] as { id: string; course_code: string }[],
        }),

    sellerIds.length
      ? createAdminClient()
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds)
      : Promise.resolve({
          data: [] as { id: string; full_name: string | null }[],
        }),
  ]);

  const courseCodes = new Map(
    (courses ?? []).map((course) => [
      course.id,
      course.course_code,
    ])
  );

  const sellerNames = new Map(
    (sellers ?? []).map((seller) => [
      seller.id,
      seller.full_name,
    ])
  );

  const purchaseStatusByFileId = new Map<string, "pending" | "completed" | "failed" | "refunded">();
  if (user) {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("file_id, status, created_at")
      .eq("buyer_id", user.id)
      .in("file_id", files.map((file) => file.id))
      .order("created_at", { ascending: false });
    for (const purchase of purchases ?? []) {
      if (purchase.file_id && !purchaseStatusByFileId.has(purchase.file_id) && ["pending", "completed", "failed", "refunded"].includes(String(purchase.status))) {
        purchaseStatusByFileId.set(purchase.file_id, purchase.status as "pending" | "completed" | "failed" | "refunded");
      }
    }
  }

  const resources: ResourceCardData[] = files.map((file) => ({
    ...file,
    course_code: file.course_id
      ? courseCodes.get(file.course_id) ?? null
      : null,
    seller_name: sellerNames.get(file.seller_id) ?? null,
    purchaseStatus: purchaseStatusByFileId.get(file.id) ?? null,
  }));

  return <ResourceCardGrid files={resources} />;
}

/* -------------------------------------------------------------------------- */
/* Departments Preview                                                        */
/* -------------------------------------------------------------------------- */

async function DepartmentsPreview() {
  const supabase = createClient();

  const [
    { data: departments },
    { data: courseRows },
    { data: fileRows },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, short_name")
      .order("name"),

    supabase
      .from("courses")
      .select("department_id"),

    supabase
      .from("files")
      .select("department_id")
      .eq("visibility", "published"),
  ]);

  if (!departments?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No departments yet.
      </p>
    );
  }

  const courseCounts = new Map<string, number>();

  for (const row of courseRows ?? []) {
    courseCounts.set(
      row.department_id,
      (courseCounts.get(row.department_id) ?? 0) + 1
    );
  }

  const resourceCounts = new Map<string, number>();

  for (const row of fileRows ?? []) {
    if (!row.department_id) continue;

    resourceCounts.set(
      row.department_id,
      (resourceCounts.get(row.department_id) ?? 0) + 1
    );
  }

  const topDepartments = departments
    .map((department) => ({
      ...department,
      courseCount: courseCounts.get(department.id) ?? 0,
      resourceCount: resourceCounts.get(department.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.resourceCount - a.resourceCount ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 6);

  if (!topDepartments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No departments yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {topDepartments.map((department, index) => (
        <DepartmentCard
          key={department.id}
          department={department}
          index={index}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Popular Courses                                                            */
/* -------------------------------------------------------------------------- */

async function PopularCourses() {
  const supabase = createClient();

  const { data: fileRows } = await supabase
    .from("files")
    .select("course_id")
    .eq("visibility", "published");

  const counts = new Map<string, number>();

  for (const row of fileRows ?? []) {
    if (!row.course_id) continue;

    counts.set(
      row.course_id,
      (counts.get(row.course_id) ?? 0) + 1
    );
  }

  const topCourseIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  if (!topCourseIds.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No courses have resources yet.
      </p>
    );
  }

  const [
    { data: courses },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, course_code, course_name, credit, department_id"
      )
      .in("id", topCourseIds),

    supabase
      .from("departments")
      .select("id, name"),
  ]);

  const departmentNames = new Map(
    (departments ?? []).map((department) => [
      department.id,
      department.name,
    ])
  );

  const orderedCourses = topCourseIds
    .map((id) =>
      (courses ?? []).find((course) => course.id === id)
    )
    .filter(
      (
        course
      ): course is NonNullable<typeof course> =>
        Boolean(course)
    );

  if (!orderedCourses.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No courses have resources yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {orderedCourses.map((course, index) => (
        <CourseCard
          key={course.id}
          index={index}
          course={{
            ...course,
            departmentName: departmentNames.get(
              course.department_id
            ),
            resourceCount: counts.get(course.id) ?? 0,
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resource Categories                                                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Homepage                                                                   */
/* -------------------------------------------------------------------------- */

async function PersonalizedShortcuts() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, role, phone_number").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || user.user_metadata?.full_name || "there";
  const firstName = name.split(/\s+/)[0] || "there";
  const accountReady = Boolean(profile?.phone_number);
  return (
    <section className="container relative z-10 -mt-5 pb-2">
      <div className="overflow-hidden rounded-3xl border bg-card/95 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Welcome back</p>
            <h2 className="mt-1 truncate text-lg font-bold sm:text-xl">Hi, {firstName} 👋</h2>
            <p className="mt-1 text-sm text-muted-foreground">{accountReady ? "Continue exploring your courses and saved resources." : "Complete your account to get the most out of StudyHub."}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button asChild variant="outline" className="h-10"><Link href="/purchases"><ShoppingBag className="h-4 w-4" />Purchases</Link></Button>
            <Button asChild variant="outline" className="h-10"><Link href="/saved"><Bookmark className="h-4 w-4" />Saved</Link></Button>
            <Button asChild className="h-10"><Link href="/dashboard"><LayoutDashboard className="h-4 w-4" />Dashboard</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        {/* ------------------------------------------------------------------ */}
        {/* Hero                                                               */}
        {/* ------------------------------------------------------------------ */}

        <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/50 via-background to-background">
          <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-accent blur-3xl" />

          <div className="container relative py-16 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Built for EWU students
              </div>

              <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your EWU courses. Your resources. One place.
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Find notes, question banks, slides, lab reports and
                projects by course. Save useful resources and share
                your own academic materials with the EWU community.
              </p>

              <form
                action="/search"
                className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-xl border bg-background p-1.5 shadow-lg"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    name="q"
                    placeholder="Search CSE303, Database Systems, notes…"
                    className="h-11 border-0 pl-10 shadow-none focus-visible:ring-0"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 px-5"
                >
                  Search
                </Button>
              </form>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="outline" asChild>
                  <Link href="/courses">
                    <BookOpen className="h-4 w-4" />
                    Browse courses
                  </Link>
                </Button>

                <Button variant="ghost" asChild>
                  <Link href="/departments">
                    Browse departments
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <PersonalizedShortcuts />

        {/* ------------------------------------------------------------------ */}
        {/* Recently Viewed                                                     */}
        {/* ------------------------------------------------------------------ */}

        <RecentlyViewed />
        <SavedResources />

        {/* ------------------------------------------------------------------ */}
        {/* Trending Resources                                                  */}
        {/* ------------------------------------------------------------------ */}

        <section className="container py-12 sm:py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                Popular resources
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                Popular resources
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Resources students are discovering and downloading most.
              </p>
            </div>

            <Link
              href="/trending"
              className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex"
            >
              View trending
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-xl border bg-muted/30"
                  />
                ))}
              </div>
            }
          >
            <TrendingFiles />
          </Suspense>
        </section>


        {/* ------------------------------------------------------------------ */}
        {/* Popular Resources                                                     */}
        {/* ------------------------------------------------------------------ */}

        <section className="container pb-12 sm:pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                Explore
              </p>

              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                Popular courses
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Start with courses students are already using.
              </p>
            </div>

            <Link
              href="/courses"
              className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-40 animate-pulse rounded-xl border bg-muted/30"
                  />
                ))}
              </div>
            }
          >
            <PopularCourses />
          </Suspense>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Departments                                                         */}
        {/* ------------------------------------------------------------------ */}

        <section className="border-y bg-muted/20">
          <div className="container py-12 sm:py-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Browse the catalog
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  Departments
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Find your program, then explore its courses.
                </p>
              </div>

              <Link
                href="/departments"
                className="hidden items-center gap-1 text-sm font-medium text-primary sm:flex"
              >
                All departments
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <Suspense
              fallback={
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-xl border bg-background"
                    />
                  ))}
                </div>
              }
            >
              <DepartmentsPreview />
            </Suspense>
          </div>
        </section>

        <FAQSection />

        {/* ------------------------------------------------------------------ */}
        {/* Feedback & Support                                                   */}
        {/* ------------------------------------------------------------------ */}

        <section className="container pb-12">
          <div className="rounded-3xl border bg-gradient-to-br from-accent/50 via-background to-background p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-primary">Your feedback matters</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Found a problem or have an idea?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Students and sellers can send suggestions, complaints, payment issues or anything that needs admin attention. We’ll keep your request in one place so it can be followed up.</p>
                <Link href="/support" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Open Support Center <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </div>
              <SupportFormCard pagePath="/" />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Upload CTA                                                          */}
        {/* ------------------------------------------------------------------ */}

        <section className="container pb-16">
          <div className="rounded-2xl border bg-primary p-6 text-primary-foreground shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
                  <FileText className="h-4 w-4" />
                  Share what you know
                </div>

                <h2 className="mt-2 text-2xl font-bold">
                  Have useful notes or a project?
                </h2>

                <p className="mt-2 max-w-xl text-sm opacity-85">
                  Upload your academic resources once and help
                  another EWU student find what they need.
                </p>
              </div>

              <Button
                variant="secondary"
                size="lg"
                asChild
              >
                <Link href="/dashboard/upload">
                  Upload a resource
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}