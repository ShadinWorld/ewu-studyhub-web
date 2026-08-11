import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/lib/utils";
import { approvePayment, rejectPayment } from "./actions";

type RelatedProfile = {
  full_name?: string | null;
  username?: string | null;
};

type RelatedFile = {
  title?: string | null;
  seller_id?: string | null;
};

function asProfile(value: unknown): RelatedProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const profile = value as Record<string, unknown>;

  return {
    full_name:
      typeof profile.full_name === "string" ? profile.full_name : null,
    username:
      typeof profile.username === "string" ? profile.username : null,
  };
}

function asFile(value: unknown): RelatedFile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const file = value as Record<string, unknown>;

  return {
    title: typeof file.title === "string" ? file.title : null,
    seller_id:
      typeof file.seller_id === "string" ? file.seller_id : null,
  };
}

function asString(value: unknown, fallback = "—"): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatSubmittedAt(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export default async function AdminPaymentsPage() {
  const supabase = createClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select(
      "id, buyer_id, file_id, amount_cents, status, payment_reference, buyer_bkash_number, payment_submitted_at, rejection_reason, invoice_number, files(title, seller_id), profiles!purchases_buyer_id_fkey(full_name, username)"
    )
    .eq("status", "pending")
    .eq("payment_method", "bkash")
    .order("payment_submitted_at", { ascending: true });

  const rows = purchases ?? [];

  const sellerIds = Array.from(
    new Set(
      rows
        .map((row) => asFile(row.files)?.seller_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: sellers } = sellerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", sellerIds)
    : { data: [] };

  const { data: sellerSettings } = sellerIds.length
    ? await supabase
        .from("seller_payment_settings")
        .select("seller_id, bkash_number")
        .in("seller_id", sellerIds)
    : { data: [] };

  const sellerMap = new Map(
    (sellers ?? []).map((seller) => [seller.id, seller])
  );

  const sellerPaymentMap = new Map(
    (sellerSettings ?? []).map((setting) => [
      setting.seller_id,
      setting.bkash_number,
    ])
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Payment Requests</h2>
        <p className="text-muted-foreground">
          Verify manual bKash payments before granting access.
        </p>
      </div>

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((payment) => {
            const buyer = asProfile(payment.profiles);
            const file = asFile(payment.files);

            const seller = file?.seller_id
              ? sellerMap.get(file.seller_id)
              : null;

            const buyerId = asString(payment.buyer_id);
            const buyerBkash = asString(payment.buyer_bkash_number);
            const paymentReference = asString(payment.payment_reference);
            const invoiceNumber = asString(payment.invoice_number);

            const sellerName =
              seller?.full_name || seller?.username || "—";

            const sellerBkash = file?.seller_id
              ? sellerPaymentMap.get(file.seller_id) ?? "Not set"
              : "—";

            return (
              <Card key={payment.id}>
                <CardHeader>
                  <CardTitle>{file?.title ?? "Resource"}</CardTitle>

                  <CardDescription>
                    Invoice {invoiceNumber} • submitted{" "}
                    {formatSubmittedAt(payment.payment_submitted_at)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Info
                      label="Amount"
                      value={formatBDT(payment.amount_cents)}
                    />

                    <Info
                      label="Buyer"
                      value={
                        buyer?.full_name ||
                        buyer?.username ||
                        buyerId
                      }
                    />

                    <Info
                      label="Sender bKash"
                      value={buyerBkash}
                    />

                    <Info
                      label="Transaction ID"
                      value={paymentReference}
                    />

                    <Info
                      label="Seller"
                      value={sellerName}
                    />

                    <Info
                      label="Seller bKash"
                      value={sellerBkash}
                    />
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
                    <form
                      action={approvePayment}
                    >
                      <input
                        type="hidden"
                        name="purchase_id"
                        value={payment.id}
                      />

                      <Button type="submit">
                        Approve payment
                      </Button>
                    </form>

                    <form
                      action={rejectPayment}
                      className="flex flex-1 gap-2"
                    >
                      <input
                        type="hidden"
                        name="purchase_id"
                        value={payment.id}
                      />

                      <Input
                        name="reason"
                        placeholder="Rejection reason"
                        required
                      />

                      <Button
                        type="submit"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No pending bKash payments.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-medium">{value}</p>
    </div>
  );
}