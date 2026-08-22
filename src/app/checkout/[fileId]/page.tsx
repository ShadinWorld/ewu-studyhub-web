import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { BkashPaymentForm } from "@/components/checkout/bkash-payment-form";
import { CopyButton } from "@/components/shared/copy-button";
import { getBuyerPriceCents } from "@/lib/platform-pricing";

export default async function CheckoutPage({ params }: { params: { fileId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${params.fileId}`);

  const { data: file } = await supabase
    .from("files")
    .select("id, title, price_cents, pricing_type, seller_id, visibility")
    .eq("id", params.fileId)
    .eq("visibility", "published")
    .single();
  if (!file || file.pricing_type !== "paid") notFound();
  if (file.seller_id === user.id) {
    return <StatusPage title="Your resource" message="You uploaded this resource, so a purchase is not needed. You already own it." href={`/files/${file.id}`} label="Open resource" />;
  }

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status, payment_reference, rejection_reason")
    .eq("file_id", file.id)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "completed"])
    .maybeSingle();

  if (existing?.status === "completed") {
    return <StatusPage title="Payment approved" message="You already have access to this resource." href={`/files/${file.id}`} label="Open resource" />;
  }
  if (existing?.status === "pending") {
    return <StatusPage title="Payment under review" message={`Your bKash payment is waiting for admin verification. Transaction ID: ${existing.payment_reference ?? "—"}`} href={`/files/${file.id}`} label="Back to resource" />;
  }

  const { data: paymentSettings } = await supabase
    .from("public_payment_settings")
    .select("bkash_number")
    .eq("id", true)
    .single();
  const buyerPriceCents = await getBuyerPriceCents(supabase as any, file.id, file.price_cents);
  const platformFeeCents = buyerPriceCents - file.price_cents;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-10">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Pay with bKash</CardTitle>
            <CardDescription>{file.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-accent/40 p-4">
              <p className="text-sm text-muted-foreground">Amount to pay</p>
              <p className="text-3xl font-bold">{formatBDT(buyerPriceCents)}</p>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground"><span>Seller price: {formatBDT(file.price_cents)}</span><span>Platform fee: {formatBDT(platformFeeCents)}</span></div>
              <p className="mt-4 text-sm">Send the exact amount to this bKash number:</p>
              <div className="mt-1 flex flex-wrap items-center gap-2"><p className="text-2xl font-bold tracking-wide">{paymentSettings?.bkash_number ?? "01716529460"}</p><CopyButton value={paymentSettings?.bkash_number ?? "01716529460"} label="Copy number" /></div>
              <p className="mt-2 text-xs text-muted-foreground">Use Send Money from your bKash account, then submit the payment details below.</p>
            </div>

            <BkashPaymentForm fileId={file.id} />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function StatusPage({ title, message, href, label }: { title: string; message: string; href: string; label: string }) {
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container flex flex-1 items-center justify-center py-10 sm:py-16"><Card className="w-full max-w-lg"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:flex sm:flex-wrap"><Button asChild><Link href={href}>{label}</Link></Button><Button asChild variant="outline"><Link href="/requests">View My Requests</Link></Button><Button asChild variant="ghost"><Link href="/notifications">Notifications</Link></Button></div></CardContent></Card></main><Footer /></div>;
}
