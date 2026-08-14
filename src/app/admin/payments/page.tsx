import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { approvePayment, rejectPayment } from "./actions";

type Profile = { full_name?: string | null };
type FileRow = { title?: string | null; seller_id?: string | null };

function asProfile(value: unknown): Profile | null {
  return value && typeof value === "object" ? value as Profile : null;
}
function asFile(value: unknown): FileRow | null {
  return value && typeof value === "object" ? value as FileRow : null;
}
function statusLabel(status: string) {
  if (status === "completed") return "Approved";
  if (status === "failed") return "Rejected";
  if (status === "pending") return "Pending";
  return status;
}

export default async function AdminPaymentsPage() {
  const supabase = createClient();
  const select = "id, buyer_id, file_id, amount_cents, status, payment_reference, buyer_bkash_number, payment_submitted_at, rejection_reason, invoice_number, files(title, seller_id), profiles!purchases_buyer_id_fkey(full_name)";

  const [{ data: pendingRows }, { data: historyRows }] = await Promise.all([
    supabase.from("purchases").select(select).eq("status", "pending").eq("payment_method", "bkash").order("payment_submitted_at", { ascending: true }),
    supabase.from("purchases").select(select).eq("payment_method", "bkash").neq("status", "pending").order("created_at", { ascending: false }).limit(30),
  ]);

  const allRows = [...(pendingRows ?? []), ...(historyRows ?? [])];
  const sellerIds = Array.from(new Set(allRows.map(r => asFile(r.files)?.seller_id).filter((id): id is string => Boolean(id))));
  const [{ data: sellers }, { data: sellerSettings }] = await Promise.all([
    sellerIds.length ? supabase.from("profiles").select("id, full_name").in("id", sellerIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    sellerIds.length ? supabase.from("seller_payment_settings").select("seller_id, bkash_number").in("seller_id", sellerIds) : Promise.resolve({ data: [] as { seller_id: string; bkash_number: string | null }[] }),
  ]);
  const sellerMap = new Map((sellers ?? []).map(s => [s.id, s]));
  const sellerPaymentMap = new Map((sellerSettings ?? []).map(s => [s.seller_id, s.bkash_number]));

  const renderRow = (payment: any, pending: boolean) => {
    const buyer = asProfile(payment.profiles);
    const file = asFile(payment.files);
    const seller = file?.seller_id ? sellerMap.get(file.seller_id) : null;
    const sellerName = seller?.full_name || "—";
    const sellerBkash = file?.seller_id ? sellerPaymentMap.get(file.seller_id) ?? "Not set" : "—";
    return <Card key={payment.id} className={pending ? "border-amber-500/30" : ""}>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div><CardTitle>{file?.title ?? "Resource"}</CardTitle><CardDescription>Invoice {payment.invoice_number ?? "—"} • {payment.payment_submitted_at ? new Date(payment.payment_submitted_at).toLocaleString() : "—"}</CardDescription></div>
          <Badge variant={pending ? "secondary" : payment.status === "completed" ? "default" : "destructive"}>{statusLabel(String(payment.status))}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Amount" value={formatBDT(payment.amount_cents)} />
          <Info label="Buyer" value={buyer?.full_name || payment.buyer_id} />
          <Info label="Sender bKash" value={payment.buyer_bkash_number ?? "—"} />
          <Info label="Transaction ID" value={payment.payment_reference ?? "—"} />
          <Info label="Seller" value={sellerName} />
          <Info label="Seller bKash" value={sellerBkash} />
          {payment.rejection_reason && <Info label="Rejection reason" value={payment.rejection_reason} />}
        </div>
        {pending && <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
          <form action={approvePayment}><input type="hidden" name="purchase_id" value={payment.id} /><Button type="submit">Approve payment</Button></form>
          <form action={rejectPayment} className="flex flex-1 gap-2"><input type="hidden" name="purchase_id" value={payment.id} /><Input name="reason" placeholder="Rejection reason" required /><Button type="submit" variant="outline">Reject</Button></form>
        </div>}
      </CardContent>
    </Card>;
  };

  return <div className="space-y-8">
    <div><h2 className="text-2xl font-bold">Payment Operations</h2><p className="text-muted-foreground">Review bKash payments, approve access, reject invalid submissions, and keep a recent audit-friendly history.</p></div>
    <section><div className="mb-3 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Needs review</h3><p className="text-sm text-muted-foreground">Approve only after checking the transaction ID and amount.</p></div><Badge>{pendingRows?.length ?? 0} pending</Badge></div>{pendingRows?.length ? <div className="space-y-4">{pendingRows.map(r => renderRow(r, true))}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No pending bKash payments.</CardContent></Card>}</section>
    <section><div className="mb-3"><h3 className="text-lg font-semibold">Recent payment history</h3><p className="text-sm text-muted-foreground">The latest approved and rejected manual payments.</p></div>{historyRows?.length ? <div className="space-y-4">{historyRows.map(r => renderRow(r, false))}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">No payment history yet.</CardContent></Card>}</section>
  </div>;
}

function Info({ label, value }: { label: string; value: unknown }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-all font-medium">{String(value ?? "—")}</p></div>; }
