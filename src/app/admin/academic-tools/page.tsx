import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, FileQuestion, ImagePlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export default async function AdminAcademicToolsPage() {
  const admin = createAdminClient();
  const [{ count: documentsCount }, { count: deadlinesCount }, { count: openRequestsCount }, { count: liveBannersCount }] = await Promise.all([
    admin.from("academic_documents").select("id", { count: "exact", head: true }),
    admin.from("deadlines").select("id", { count: "exact", head: true }),
    admin.from("resource_requests").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    admin.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const tiles = [
    { href: "/admin/academic-tools/calendar", icon: CalendarDays, title: "Academic calendar & final exams", description: "Upload the academic calendar and final exam schedule PDFs.", meta: `${documentsCount ?? 0} documents` },
    { href: "/admin/academic-tools/deadlines", icon: Clock3, title: "Deadline tracker", description: "Registration, payment and academic deadlines shown to students.", meta: `${deadlinesCount ?? 0} deadlines` },
    { href: "/admin/academic-tools/requests", icon: FileQuestion, title: "Resource requests", description: "Student requests for resources that aren't on StudyHub yet.", meta: `${openRequestsCount ?? 0} open` },
    { href: "/admin/academic-tools/banners", icon: ImagePlus, title: "Giant Hero Banner Manager", description: "Homepage campaign banners — schedule, target and track performance.", meta: `${liveBannersCount ?? 0} live` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Student experience</p>
        <h2 className="text-2xl font-bold">Academic Tools & Updates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage calendars, exam PDFs, deadlines, resource requests and homepage promotions — each in its own page.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><tile.icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{tile.title}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tile.description}</p>
                <p className="mt-2 text-xs font-semibold text-primary">{tile.meta}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
