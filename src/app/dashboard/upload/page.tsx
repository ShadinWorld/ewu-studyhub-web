import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/upload/upload-form";
import { Button } from "@/components/ui/button";

export default async function UploadPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/upload");

  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).single();
  const isAdminUploader = profile?.role === "admin" || profile?.role === "super_admin";
  if (!profile?.is_seller && profile?.role !== "seller" && !isAdminUploader) redirect("/dashboard/become-seller?next=/dashboard/upload");

  const { data: paymentSettings } = await supabase
    .from("seller_payment_settings")
    .select("bkash_number")
    .eq("seller_id", user.id)
    .maybeSingle();
  const needsBkash = !isAdminUploader && !paymentSettings?.bkash_number;

  const { data: departments } = await supabase.from("departments").select("id, name, short_name").order("name");
  const { data: courses } = await supabase.from("courses").select("id, course_code, course_name, department_id").order("course_code");

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-bold">Upload a resource</h1>
      <p className="mb-8 text-muted-foreground">
        Share notes, question banks, or projects with your batch — free, or for sale.
      </p>
      {needsBkash && (
        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
              <Wallet className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">আপলোডের আগে bKash নম্বর যোগ করুন</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                আপলোড করার আগে আপনার bKash পেআউট নম্বর যোগ করা বাধ্যতামূলক — আপনার রিসোর্স বিক্রি হলে এই নম্বরেই টাকা পাঠানো হবে।
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0"><Link href="/dashboard/payment-settings">bKash নম্বর যোগ করুন</Link></Button>
        </div>
      )}
      <UploadForm departments={departments ?? []} courses={courses ?? []} />
    </div>
  );
}
