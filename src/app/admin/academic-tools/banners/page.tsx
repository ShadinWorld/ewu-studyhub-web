import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { HomepageBannerManager } from "@/components/admin/homepage-banner-manager";

export default async function BannersAdminPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const admin = createAdminClient();
  const [{ data: announcements }, { data: departments }, { data: courses }, { data: bannerSettings }, { data: dailyStats }] = await Promise.all([
    admin
      .from("announcements")
      .select(
        "id,title,body,badge,cta_label,cta_link,image_url,mobile_image_url,image_alt,starts_at,ends_at,is_active,display_order,status,audience,is_dismissible,display_frequency,publish_mode,duration_days,target_department_id,target_course_id,impression_count,click_count",
      )
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("departments").select("id,name,short_name").order("short_name"),
    admin.from("courses").select("id,course_code,course_name,department_id").order("course_code").limit(2000),
    admin.from("homepage_banner_settings").select("audience,max_visible,autoplay,auto_rotate_seconds,show_dots,show_arrows,transition").order("audience"),
    admin
      .from("announcement_daily_stats")
      .select("announcement_id,stat_date,impression_count,click_count")
      .gte("stat_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order("stat_date", { ascending: false })
      .limit(1000),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Academic Tools & Updates</Link>
        <p className="mt-3 text-sm font-semibold text-primary">Homepage campaigns</p>
        <h2 className="text-2xl font-bold tracking-tight">Giant Hero Banner Manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create image-led campaigns, target audiences, schedule visibility, control order, preview mobile and review campaign performance.</p>
        {searchParams?.saved ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}
      </div>
      <HomepageBannerManager
        banners={(announcements ?? []) as any}
        departments={departments ?? []}
        courses={courses ?? []}
        settings={(bannerSettings ?? []) as any}
        daily={(dailyStats ?? []) as any}
      />
    </div>
  );
}
