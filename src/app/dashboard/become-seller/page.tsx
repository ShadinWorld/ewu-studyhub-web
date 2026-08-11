import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BecomeSellerForm } from "@/components/dashboard/become-seller-form";

export default async function BecomeSellerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/become-seller");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_seller, role, university_email, student_id_verification_status")
    .eq("id", user.id)
    .single();

  if (profile?.is_seller || profile?.role === "seller") {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-lg py-10">
      <h1 className="text-2xl font-bold">Become a seller</h1>
      <p className="mb-8 text-muted-foreground">
        Only verified EWU students can upload and sell resources — this keeps the marketplace trustworthy.
      </p>
      <BecomeSellerForm profile={profile} />
    </div>
  );
}
