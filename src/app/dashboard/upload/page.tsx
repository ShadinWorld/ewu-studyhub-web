import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/upload/upload-form";

export default async function UploadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/upload");

  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).single();
  if (!profile?.is_seller && profile?.role !== "seller") redirect("/dashboard/become-seller?next=/dashboard/upload");

  const { data: departments } = await supabase.from("departments").select("id, name, short_name").order("name");
  const { data: courses } = await supabase.from("courses").select("id, course_code, course_name, department_id").order("course_code");

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-bold">Upload a resource</h1>
      <p className="mb-8 text-muted-foreground">
        Share notes, question banks, or projects with your batch — free, or for sale.
      </p>
      <UploadForm departments={departments ?? []} courses={courses ?? []} />
    </div>
  );
}
