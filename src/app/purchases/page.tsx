import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, Download, ShoppingBag, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default async function PurchasesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/purchases");

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, file_id, amount_cents, status, payment_method, payment_reference, created_at, rejection_reason, files(title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container max-w-4xl flex-1 py-8 sm:py-10">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm sm:p-7">
        <p className="text-sm font-semibold text-primary">Your library</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">My Purchases</h1>
        <p className="mt-2 text-sm text-muted-foreground">Every payment and approved resource stays here. Pending items cannot be purchased twice.</p>
      </div>

      <div className="mt-6 space-y-3">
        {purchases?.length ? purchases.map((purchase) => {
          const file = purchase.files as { title?: string | null } | null;
          const status = String(purchase.status ?? "unknown");
          const rejectionReason = purchase.rejection_reason ? String(purchase.rejection_reason) : null;
          const completed = status === "completed";
          const pending = status === "pending";
          const rejected = status === "failed";
          return (
            <Card key={purchase.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{file?.title ?? "Resource"}</p>
                      {completed && <Badge className="gap-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" />Purchased</Badge>}
                      {pending && <Badge className="gap-1 rounded-full bg-amber-500 text-white hover:bg-amber-500"><Clock3 className="h-3 w-3" />Payment pending</Badge>}
                      {rejected && <Badge variant="destructive" className="gap-1 rounded-full"><XCircle className="h-3 w-3" />Rejected</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatBDT(purchase.amount_cents)} · {String(purchase.payment_method ?? "—")} · {String(purchase.payment_reference ?? "—")}</p>
                    {rejectionReason && <p className="mt-2 rounded-lg bg-destructive/5 p-2 text-sm text-destructive">Reason: {rejectionReason}</p>}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {completed && purchase.file_id && (
                      <>
                        <Button asChild size="sm"><a href={`/api/files/${purchase.file_id}/view`} target="_blank" rel="noopener noreferrer">View</a></Button>
                        <Button asChild size="sm" variant="outline"><a href={`/api/files/${purchase.file_id}/download`}><Download className="mr-1.5 h-3.5 w-3.5" />Download</a></Button>
                      </>
                    )}
                    {pending && <Button size="sm" variant="outline" disabled><Clock3 className="mr-1.5 h-3.5 w-3.5" />Waiting for approval</Button>}
                    {rejected && purchase.file_id && <Button asChild size="sm"><Link href={`/checkout/${purchase.file_id}`}><ShoppingBag className="mr-1.5 h-3.5 w-3.5" />Buy again</Link></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <Card>
            <CardHeader><CardTitle>No purchases yet</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <ShoppingBag className="h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Find a course and choose a resource to get started.</p>
              <Button asChild className="mt-4"><Link href="/courses">Browse courses</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}
