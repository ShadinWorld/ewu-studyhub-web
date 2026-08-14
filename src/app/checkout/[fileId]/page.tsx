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
import { submitBkashPayment } from "./actions";

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
              <p className="text-3xl font-bold">{formatBDT(file.price_cents)}</p>
              <p className="mt-4 text-sm">Send the exact amount to this bKash number:</p>
              <p className="mt-1 text-2xl font-bold tracking-wide">{paymentSettings?.bkash_number ?? "01716529460"}</p>
              <p className="mt-2 text-xs text-muted-foreground">Use Send Money from your bKash account, then submit the transaction details below.</p>
            </div>

            <form action={submitBkashPayment} className="mt-6 space-y-4">
              <input type="hidden" name="fileId" value={file.id} />
              <div className="space-y-2">
                <Label htmlFor="buyer_bkash_number">Your bKash number</Label>
                <Input id="buyer_bkash_number" name="buyer_bkash_number" inputMode="numeric" placeholder="01XXXXXXXXX" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_reference">bKash Transaction ID <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="payment_reference" name="payment_reference" placeholder="e.g. 8A7B6C5D4E" />
              </div>
              <p className="text-xs text-muted-foreground">Your payment will remain pending until an admin checks the transaction. Access is granted only after approval.</p>
              <Button type="submit" className="w-full" size="lg">Submit payment for verification</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

function StatusPage({ title, message, href, label }: { title: string; message: string; href: string; label: string }) {
  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container flex flex-1 items-center justify-center py-16"><Card className="max-w-lg"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{message}</CardDescription></CardHeader><CardContent><Button asChild><Link href={href}>{label}</Link></Button></CardContent></Card></main><Footer /></div>;
}
