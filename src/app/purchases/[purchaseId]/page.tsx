import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Download, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";

export default async function PurchaseDetailPage({ params }: { params: { purchaseId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/purchases/${params.purchaseId}`);
  const { data: purchase } = await supabase.from("purchases").select("id,invoice_number,file_id,amount_cents,commission_cents,seller_earning_cents,status,payment_method,payment_reference,buyer_bkash_number,payment_submitted_at,approved_at,rejection_reason,created_at,files(title)").eq("id", params.purchaseId).eq("buyer_id", user.id).maybeSingle();
  if (!purchase) notFound();
  const { data: events } = await supabase.from("activity_events").select("title,body,created_at").eq("profile_id", user.id).eq("entity_type","purchase").eq("entity_id",purchase.id).order("created_at",{ascending:true});
  const file = purchase.files as { title?: string | null } | null;
  const timeline = events?.length ? events : [
    { title:"Purchase request submitted", body:"Your payment request was sent for admin review.", created_at: purchase.created_at },
    ...(purchase.approved_at ? [{ title:"Purchase completed", body:"Access was granted after payment approval.", created_at: purchase.approved_at }] : []),
  ];
  const isCompleted = purchase.status === "completed";
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container max-w-3xl flex-1 py-6 sm:py-10">
    <div className="flex items-start gap-3"><Button asChild variant="outline" size="icon"><Link href="/purchases" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button><div><p className="text-sm font-semibold text-primary">Purchase record</p><h1 className="text-2xl font-bold sm:text-3xl">{file?.title ?? "Resource purchase"}</h1><p className="mt-1 text-xs text-muted-foreground">Purchase ID: {purchase.invoice_number ?? `PUR-${purchase.id.slice(0,8).toUpperCase()}`}</p></div></div>
    <Card className="mt-6"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Transaction details</CardTitle><CardDescription>Your permanent buyer-side receipt.</CardDescription></div><Badge variant={purchase.status === "failed" ? "destructive" : purchase.status === "completed" ? "default" : "secondary"}>{purchase.status}</Badge></div></CardHeader><CardContent className="space-y-2 text-sm"><Row label="Amount" value={formatBDT(purchase.amount_cents)} /><Row label="Payment method" value={String(purchase.payment_method ?? "—")} /><Row label="Payment reference" value={String(purchase.payment_reference ?? "—")} /><Row label="Submitted" value={new Date(purchase.payment_submitted_at ?? purchase.created_at).toLocaleString("en-BD")} />{purchase.approved_at ? <Row label="Approved" value={new Date(purchase.approved_at).toLocaleString("en-BD")} /> : null}{purchase.rejection_reason ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"><strong>Admin reason:</strong> {purchase.rejection_reason}</div> : null}</CardContent></Card>
    <Card className="mt-5"><CardHeader><CardTitle>Purchase timeline</CardTitle><CardDescription>Track exactly what happened and when.</CardDescription></CardHeader><CardContent><div className="space-y-4">{timeline.map((event,index)=><div key={`${event.created_at}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"/><div><p className="text-sm font-semibold">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleString("en-BD")}</p></div></div>)}</div></CardContent></Card>
    <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href={isCompleted && purchase.file_id ? `/files/${purchase.file_id}` : "/purchases"}>{isCompleted ? "Open resource" : "Back to purchases"}</Link></Button>{purchase.file_id ? <Button asChild variant="outline"><Link href={`/files/${purchase.file_id}`}><Download className="h-4 w-4"/>Resource page</Link></Button> : null}</div>
  </main><Footer /></div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="max-w-[62%] break-words text-right font-medium">{value}</span></div>; }
