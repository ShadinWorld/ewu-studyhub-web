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
  Store,
  Upload,
  CalendarDays,
  ClipboardCheck,
  FileClock,
  FileQuestion,
  Megaphone,
  Bell,
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
import { HomepageBannerCarousel, type HomepageBanner } from "@/components/homepage/homepage-banner-carousel";

/* -------------------------------------------------------------------------- */
/* Trending Resources                                                         */
/* -------------------------------------------------------------------------- */

async function TrendingFiles() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: files } = await supabase
    .from("files")
    .select(
      "id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, views_count, category, course_id, seller_id"
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
    );

  if (!topDepartments.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No departments yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
      {topDepartments.map((department, index) => (
        <div key={department.id} className="min-w-0">
        <DepartmentCard
          key={department.id}
          department={department}
          index={index}
        />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Popular Courses                                                            */
/* -------------------------------------------------------------------------- */

async function RecentResources() {
  const supabase = createClient();
  const { data: files } = await supabase.from("files").select("id,title,thumbnail_url,file_kind,pricing_type,price_cents,average_rating,reviews_count,downloads_count,views_count,category,course_id,seller_id").eq("visibility", "published").order("created_at", { ascending: false }).limit(8);
  if (!files?.length) return null;
  const courseIds = Array.from(new Set(files.map(f=>f.course_id).filter((x): x is string=>Boolean(x))));
  const sellerIds = Array.from(new Set(files.map(f=>f.seller_id).filter((x): x is string=>Boolean(x))));
  const [{data:courses},{data:sellers}] = await Promise.all([
    courseIds.length ? supabase.from("courses").select("id,course_code").in("id",courseIds) : Promise.resolve({data:[] as {id:string;course_code:string}[]}),
    sellerIds.length ? createAdminClient().from("profiles").select("id,full_name").in("id",sellerIds) : Promise.resolve({data:[] as {id:string;full_name:string|null}[]}),
  ]);
  const courseMap=new Map((courses??[]).map(c=>[c.id,c.course_code]));
  const sellerMap=new Map((sellers??[]).map(x=>[x.id,x.full_name]));
  const resources: ResourceCardData[]=files.map(f=>({...f,course_code:f.course_id?courseMap.get(f.course_id)??null:null,seller_name:sellerMap.get(f.seller_id)??null,purchaseStatus:null}));
  return <section className="container pt-10 sm:pt-12"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Fresh uploads</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Recently added resources</h2><p className="mt-1 text-sm text-muted-foreground">The latest resources added by EWU StudyHub sellers.</p></div><Link href="/search?sort=recent" className="text-sm font-semibold text-primary">View all <ArrowRight className="ml-1 inline h-4 w-4"/></Link></div><ResourceCardGrid files={resources}/></section>;
}

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
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
      {orderedCourses.map((course, index) => (
        <div key={course.id} className="min-w-0">
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
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resource Categories                                                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Homepage announcements + tools                                             */
/* -------------------------------------------------------------------------- */

async function HomepageBannerHero(){
  const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); let role:"guest"|"student"|"seller"|"admin"="guest",departmentId:string|null=null,firstName="there",departmentName="your department";
  if(user){const {data:p}=await supabase.from("profiles").select("role,is_seller,department_id,full_name").eq("id",user.id).maybeSingle();if(p){role=p.role==="admin"||p.role==="super_admin"?"admin":(p.is_seller||p.role==="seller"?"seller":"student");departmentId=p.department_id;firstName=(p.full_name||user.user_metadata?.full_name||"there").split(/\s+/)[0]||"there";if(p.department_id){const {data:d}=await supabase.from("departments").select("name").eq("id",p.department_id).maybeSingle();departmentName=d?.name??"your department";}}}
  const bannerAudience: "student" | "seller" | "admin" | "all" = role === "guest" ? "all" : role;
  const [{data:banners},{data:setting}]=await Promise.all([supabase.from("announcements").select("id,title,body,badge,cta_label,cta_link,image_url,mobile_image_url,image_alt,starts_at,ends_at,display_order,audience,is_dismissible,display_frequency,target_department_id,target_course_id,impression_count,click_count").eq("is_active",true).in("status",["published","scheduled"]).order("display_order",{ascending:true}).order("created_at",{ascending:false}).limit(30),supabase.from("homepage_banner_settings").select("max_visible,autoplay,auto_rotate_seconds,show_dots,show_arrows,transition").eq("audience",bannerAudience).maybeSingle()]);
  const now=Date.now(); const eligible=(banners??[]).filter(b=>(!b.starts_at||new Date(b.starts_at).getTime()<=now)&&(!b.ends_at||new Date(b.ends_at).getTime()>=now)&&(!b.target_department_id||b.target_department_id===departmentId)) as HomepageBanner[]; if(!eligible.length)return null;
  return <HomepageBannerCarousel banners={eligible} settings={setting??{max_visible:5,autoplay:true,auto_rotate_seconds:6,show_dots:true,show_arrows:true,transition:"fade_slide"}} personalization={{firstName,departmentName}}/>;
}

async function PendingActionsHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: notifications } = await supabase.from("notifications").select("id,type,title,body,created_at,link,is_read").eq("profile_id", user.id).in("type", ["upload_pending","payout_pending","seller_verification_pending"]).order("created_at", { ascending: false }).limit(6);
  if (!notifications?.length) return null;
  return <section className="container pt-6 sm:pt-8"><div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Action status</p><h2 className="mt-1 text-xl font-bold">Your pending requests</h2><p className="mt-1 text-sm text-muted-foreground">Track uploads, seller verification and payout requests until admin resolves them.</p></div><Button asChild variant="outline" size="sm"><Link href="/notifications">View notifications</Link></Button></div><div className="mt-4 space-y-2">{notifications.map(n => <div key={n.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"/><p className="font-medium">{n.title}</p></div><p className="mt-1 text-xs text-muted-foreground">{n.body || "Waiting for admin approval."} · {new Date(n.created_at).toLocaleString()}</p></div>{n.link ? <Button asChild size="sm" variant="outline"><Link href={n.link}>Open</Link></Button> : null}</div>)}</div></div></section>;
}

function StudentToolsPreview() {
  const tools = [
    ["/tools/academic-calendar", "Academic Calendar", "Current semester dates", CalendarDays],
    ["/tools/final-exams", "Final Exam Schedule", "Term-wise exam PDF", ClipboardCheck],
    ["/tools/deadlines", "Deadline Tracker", "Never miss an important date", FileClock],
    ["/tools/resource-request", "Request a Resource", "Ask for missing materials", FileQuestion],
  ] as const;
  return <section className="container pt-8 sm:pt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Study tools</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Study Essentials</h2><p className="mt-1 text-sm text-muted-foreground">Useful EWU tools, kept compact so the homepage stays focused.</p></div><Link href="/tools" className="hidden text-sm font-semibold text-primary sm:inline-flex">View all <ArrowRight className="ml-1 h-4 w-4"/></Link></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">{tools.map(([href,title,text,Icon])=><Link key={href} href={href} className="group rounded-2xl border bg-card p-3 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md sm:p-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10"><Icon className="h-4 w-4 sm:h-5 sm:w-5"/></div><p className="mt-2 line-clamp-1 text-sm font-semibold group-hover:text-primary sm:mt-3">{title}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground sm:text-xs sm:leading-5">{text}</p></Link>)}</div></section>;
}

/* -------------------------------------------------------------------------- */
/* Homepage                                                                   */
/* -------------------------------------------------------------------------- */


async function SellerResourcesHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).maybeSingle();
  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");
  if (!isSeller) return null;
  const { data: files } = await supabase.from("files").select("id,title,thumbnail_url,file_kind,pricing_type,price_cents,average_rating,reviews_count,downloads_count,views_count,category,course_id,seller_id").eq("seller_id", user.id).neq("visibility", "rejected").order("created_at", { ascending: false }).limit(6);
  if (!files?.length) return null;
  const courseIds = Array.from(new Set(files.map(f => f.course_id).filter((x): x is string => Boolean(x))));
  const { data: courses } = courseIds.length ? await supabase.from("courses").select("id,course_code").in("id", courseIds) : { data: [] as {id:string;course_code:string}[] };
  const courseMap = new Map((courses ?? []).map(c => [c.id, c.course_code]));
  const resources: ResourceCardData[] = files.map(f => ({ ...f, course_code: f.course_id ? courseMap.get(f.course_id) ?? null : null, seller_name: "You", purchaseStatus: null, isOwner: true }));
  return <section className="container pt-8 sm:pt-10"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-primary">Your resources</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">Your latest uploads</h2><p className="mt-1 text-sm text-muted-foreground">Your resources appear here first. You are the owner, so no purchase is needed.</p></div><Button asChild variant="outline"><Link href="/dashboard/upload"><Upload className="h-4 w-4"/>Upload</Link></Button></div><ResourceCardGrid files={resources} /></section>;
}

async function SellerCongratulations() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: note } = await supabase.from("notifications").select("id,title,body").eq("profile_id", user.id).eq("type", "seller_approved").eq("is_read", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!note) return null;
  return <div className="container pt-6"><div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Congratulations 🎉</p><h2 className="mt-1 text-xl font-bold">You are now an EWU StudyHub Seller!</h2><p className="mt-2 text-sm text-muted-foreground">{note.body || "You can now upload and sell your academic resources."}</p></div><div className="mt-4 flex flex-wrap gap-2"><Button asChild><Link href="/dashboard/upload"><Upload className="h-4 w-4"/>Upload your first resource</Link></Button><Button asChild variant="outline"><Link href="/dashboard">Seller dashboard</Link></Button></div></div></div>;
}

async function PersonalizedShortcuts() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, role, phone_number").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || user.user_metadata?.full_name || "there";
  const firstName = name.split(/\s+/)[0] || "there";
  const accountReady = Boolean(profile?.phone_number);
  const isSeller = profile?.role === "seller";
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
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
            <Button asChild variant="outline" className="h-10"><Link href="/notifications"><Bell className="h-4 w-4" />Notifications</Link></Button>
            <Button asChild className="h-10"><Link href={isAdmin ? "/admin" : "/dashboard"}><LayoutDashboard className="h-4 w-4" />{isAdmin ? "Admin" : "Dashboard"}</Link></Button>
            {!isSeller && !isAdmin && <Button asChild variant="outline" className="h-10"><Link href="/dashboard/become-seller"><Store className="h-4 w-4" />Become a seller</Link></Button>}
            {isSeller && <Button asChild variant="outline" className="h-10"><Link href="/dashboard/upload"><Upload className="h-4 w-4" />Upload</Link></Button>}
          </div>
        </div>
      </div>
    </section>
  );
}

async function LoggedOutHeroCTA() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return null;
  return <Button asChild size="lg" className="h-11"><Link href="/login">Login / Get started</Link></Button>;
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        {/* The campaign banner is intentionally the first major visual element. */}
        <Suspense fallback={<div className="min-h-[320px] bg-muted/20 sm:min-h-[390px] lg:min-h-[470px]" />}>
          <HomepageBannerHero />
        </Suspense>

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
                <LoggedOutHeroCTA />
              </div>
            </div>
          </div>
        </section>

        <PersonalizedShortcuts />
        <SellerCongratulations />
        <SellerResourcesHome />

        <StudentToolsPreview />
        <RecentResources />

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
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
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
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
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
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
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
