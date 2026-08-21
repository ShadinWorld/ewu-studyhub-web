import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { MyRequestsList, type RequestItem } from "@/components/requests/my-requests-list";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default async function MyRequestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/requests");

  const [{ data: profile }, { data: files }, { data: payouts }, { data: purchases }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("role,is_seller,student_id_verification_status,student_id_document_url,university_email").eq("id", user.id).single(),
    supabase.from("files").select("id,title,visibility,rejection_reason,created_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("payouts").select("id,amount_cents,status,created_at,processed_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("purchases").select("id,file_id,amount_cents,status,rejection_reason,payment_submitted_at,created_at,files(title)").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("notifications").select("id,type,title,body,link,created_at,is_read").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);

  const notes = notifications ?? [];
  const isSeller = Boolean(profile?.is_seller || profile?.role === "seller");
  const requests: RequestItem[] = [];
  const { data: responseSettings } = await (supabase as any).from("platform_response_time_settings").select("category,estimated_hours");
  const responseHours = new Map<string, number>(
    (responseSettings ?? []).map((row: any): [string, number] => [
      String(row.category),
      Number(row.estimated_hours),
    ])
  );
  const eta = (category: string): number =>
    responseHours.get(category) ?? responseHours.get("default") ?? 6;

  if (profile?.student_id_verification_status !== "unverified" || profile?.student_id_document_url || profile?.university_email) {
    const status = profile?.student_id_verification_status === "verified" ? "Approved" : profile?.student_id_verification_status === "rejected" ? "Rejected" : "Under review";
    const tone = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending";
    const note = notes.find((n) => ["seller_verification_pending", "seller_approved", "seller_rejected"].includes(n.type));
    requests.push({ id: `seller-${user.id}`, type: "Seller verification", reference: "EWU seller verification", submittedAt: note?.created_at ?? new Date().toISOString(), status, tone, detail: note?.body ?? "Your EWU email and student ID verification request.", link: "/dashboard/become-seller", estimatedHours: eta("seller_verification") });
  }

  if (isSeller) {
    for (const file of files ?? []) {
      const status = file.visibility === "published" ? "Approved" : file.visibility === "rejected" ? "Rejected" : file.visibility === "draft" ? "Under review" : "Archived";
      const tone = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending";
      const note = notes.find((n) => ["upload_pending", "upload_approved", "upload_rejected"].includes(n.type) && (n.body ?? "").includes(file.title));
      requests.push({ id: file.id, type: "Resource approval", reference: file.title, submittedAt: note?.created_at ?? file.created_at, status, tone, detail: file.rejection_reason ? `Admin reason: ${file.rejection_reason}` : note?.body ?? "Resource is waiting for admin review.", link: file.visibility === "published" ? `/files/${file.id}` : "/dashboard", estimatedHours: eta("resource_approval") });
    }

    for (const payout of payouts ?? []) {
      const status = payout.status === "completed" ? "Paid" : payout.status === "failed" ? "Rejected" : "Under review";
      const tone = status === "Paid" ? "completed" : status === "Rejected" ? "rejected" : "pending";
      const note = notes.find((n) => ["payout_pending", "payout_completed", "report_update"].includes(n.type) && (n.body ?? "").toLowerCase().includes("payout"));
      requests.push({ id: payout.id, type: "Payout request", reference: `Payout #${payout.id.slice(0, 8).toUpperCase()}`, amountCents: payout.amount_cents, submittedAt: payout.created_at, status, tone, detail: note?.body ?? "Your payout request and admin processing status.", link: "/dashboard/payment-settings", estimatedHours: eta("payout_request") });
    }
  }

  for (const purchase of purchases ?? []) {
    const file = purchase.files as { title?: string | null } | null;
    const status = purchase.status === "completed" ? "Approved" : purchase.status === "failed" ? "Rejected" : "Under review";
    const tone = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "pending";
    requests.push({ id: purchase.id, type: "Purchase request", reference: file?.title ?? "Resource purchase", amountCents: purchase.amount_cents, submittedAt: purchase.payment_submitted_at ?? purchase.created_at, status, tone, detail: purchase.rejection_reason ? `Admin reason: ${purchase.rejection_reason}` : "bKash payment request sent for admin review.", link: purchase.status === "completed" ? `/files/${purchase.file_id}` : `/checkout/${purchase.file_id}`, estimatedHours: eta("purchase_request") });
  }

  requests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container max-w-4xl flex-1 py-6 sm:py-10">
        <div className="flex items-start gap-3 sm:items-center">
          <Button asChild variant="outline" size="icon" className="shrink-0"><Link href="/dashboard" aria-label="Back to dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">Sensitive activity</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Requests</h1><p className="mt-1 text-sm text-muted-foreground">Confirmations, current status, submitted time and admin decisions stay in one place.</p></div>
          <Button asChild variant="outline" size="icon" className="shrink-0"><Link href="/notifications" aria-label="Open notifications"><BellRing className="h-4 w-4" /></Link></Button>
        </div>

        <div className="mt-5 rounded-2xl border bg-primary/[0.03] p-4 sm:p-5">
          <p className="font-semibold">Keep this page handy</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Every seller verification, resource approval, payout and purchase request that belongs to this account is shown here with its latest status.</p>
        </div>

        <MyRequestsList requests={requests} />
      </main>
      <Footer />
    </div>
  );
}
