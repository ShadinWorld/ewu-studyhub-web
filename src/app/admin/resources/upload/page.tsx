import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/upload/upload-form";

export default async function AdminUploadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/resources/upload");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin","super_admin"].includes(profile.role)) redirect("/admin");
  const [{ data: departments }, { data: courses }] = await Promise.all([supabase.from("departments").select("id,name,short_name").order("name"), supabase.from("courses").select("id,course_code,course_name,department_id").order("course_code")]);
  return <div className="container max-w-2xl py-8"><h2 className="text-2xl font-bold">Admin resource upload</h2><p className="mt-1 text-sm text-muted-foreground">Upload up to 5 resources at once. Each becomes a separate resource record under your admin account.</p><div className="mt-6"><UploadForm departments={departments ?? []} courses={courses ?? []} allowAdmin /></div></div>;
}
