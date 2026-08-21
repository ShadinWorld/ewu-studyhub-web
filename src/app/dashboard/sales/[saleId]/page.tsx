import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";

function statusBadge(status: string) {
  if (status === "completed") return <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
  if (status === "pending") return <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500"><Clock3 className="h-3 w-3" />Pending</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status}</Badge>;
}

export default async function SellerSaleDetailPage({ params }: { params: { saleId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/sales/${params.saleId}`);
  const { data: profile } = await supabase.from("profiles").select("is_seller, role").eq("id", user.id).maybeSingle();
  if (!profile?.is_seller && profile?.role !== "seller") redirect("/dashboard");

  const { data: sale } = await supabase.from("purchases").select("id, invoice_number, file_id, buyer_id, amount_cents, seller_earning_cents, commission_cents, status, payment_method, payment_reference, created_at, payment_submitted_at, approved_at, rejection_reason, files(title), profiles!purchases_buyer_id_fkey(full_name)").eq("id", params.saleId).maybeSingle();
  if (!sale) notFound();
  const { data: events } = await supabase.from("activity_events").select("id,event_type,title,body,created_at,metadata").eq("entity_type","purchase").eq("entity_id",sale.id).order("created_at",{ascending:true});
  const file = sale.files as { title?: string | null } | null;
  const buyer = sale.profiles as { full_name?: string | null } | null;
  const timeline = events?.length ? events.map(e => ({ label:e.title, detail:e.body, at:e.created_at })) : [
    { label:"Purchase submitted", detail:"Buyer payment request created.", at:sale.created_at },
    ...(sale.approved_at ? [{ label:"Approved", detail:"Payment was approved and the sale was completed.", at:sale.approved_at }] : []),
  ];

  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container max-w-3xl flex-1 py-6 sm:py-10">
    <div className="flex items-start gap-3"><Button asChild variant="outline" size="icon"><Link href="/dashboard/sales" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button><div className="min-w-0"><p className="text-sm font-semibold text-primary">Seller sale record</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{file?.title ?? "Resource sale"}</h1><p className="mt-1 text-xs text-muted-foreground">Sale ID: {sale.invoice_number ?? `PUR-${sale.id.slice(0,8).toUpperCase()}`}</p></div></div>
    <Card className="mt-6"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Transaction details</CardTitle><CardDescription>This is your permanent seller-side record for the sale.</CardDescription></div>{statusBadge(String(sale.status))}</div></CardHeader><CardContent className="space-y-3 text-sm">
      <Row label="Buyer" value={buyer?.full_name ?? "Student"} /><Row label="Gross sale" value={formatBDT(sale.amount_cents)} /><Row label="Platform commission" value={formatBDT(sale.commission_cents)} /><Row label="Your earnings" value={formatBDT(sale.seller_earning_cents)} /><Row label="Payment method" value={String(sale.payment_method ?? "—")} /><Row label="Payment reference" value={String(sale.payment_reference ?? "—")} /><Row label="Created" value={new Date(sale.created_at).toLocaleString("en-BD")} />
      {sale.rejection_reason ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><strong>Admin note:</strong> {sale.rejection_reason}</div> : null}
    </CardContent></Card>
    <Card className="mt-5"><CardHeader><CardTitle>Sale timeline</CardTitle><CardDescription>Every tracked status change is shown in order.</CardDescription></CardHeader><CardContent><div className="space-y-4">{timeline.map((item,i)=><div key={`${item.at}-${i}`} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"/><div><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(item.at).toLocaleString("en-BD")}</p></div></div>)}</div></CardContent></Card>
    <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link href="/dashboard/sales">Back to Sales</Link></Button>{sale.file_id ? <Button asChild variant="outline"><Link href={`/files/${sale.file_id}`}>View resource</Link></Button> : null}</div>
  </main><Footer /></div>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0"><span className="text-muted-foreground">{label}</span><span className="max-w-[62%] break-words text-right font-medium">{value}</span></div>;
}
