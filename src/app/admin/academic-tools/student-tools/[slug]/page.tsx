import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

const managementRoutes: Record<string, string> = {
  "academic-calendar": "/admin/academic-tools/calendar",
  "final-exams": "/admin/academic-tools/calendar",
  "deadlines": "/admin/academic-tools/deadlines",
  "resource-request": "/admin/academic-tools/requests",
  "prerequisite-checker": "/admin/academic-tools/prerequisites",
  "grade-calculator": "/admin/academic-tools/grade-calculator",
};

export default async function StudentToolManageRedirect({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: tool } = await admin.from("student_tool_catalog").select("slug").eq("slug", params.slug).maybeSingle();
  if (!tool) notFound();
  const href = managementRoutes[params.slug];
  if (href) redirect(href);
  redirect(`/admin/academic-tools/student-tools?saved=${encodeURIComponent("Custom tools are managed from the main catalog")}`);
}
