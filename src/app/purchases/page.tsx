import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export default async function PurchasesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/purchases");
  }

  const { data: purchases } = await supabase
    .from("purchases")
    .select(
      "id, file_id, amount_cents, status, payment_method, payment_reference, created_at, rejection_reason, files(title)"
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-2xl font-bold">My Purchases</h1>

      <p className="mt-1 text-muted-foreground">
        Track your payments and access approved resources.
      </p>

      <div className="mt-6 space-y-3">
        {purchases?.length ? (
          purchases.map((purchase) => {
            const file = purchase.files as
              | { title?: string | null }
              | null;

            const status = String(purchase.status ?? "unknown");
            const paymentMethod = String(
              purchase.payment_method ?? "—"
            );
            const paymentReference = String(
              purchase.payment_reference ?? "—"
            );

            const rejectionReason =
              purchase.rejection_reason !== null &&
              purchase.rejection_reason !== undefined
                ? String(purchase.rejection_reason)
                : null;

            return (
              <Card key={purchase.id}>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {file?.title ?? "Resource"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatBDT(purchase.amount_cents)} •{" "}
                      {paymentMethod} • {paymentReference}
                    </p>

                    {rejectionReason && (
                      <p className="mt-1 text-sm text-destructive">
                        Rejected: {rejectionReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize">
                      {status}
                    </span>

                    {status === "completed" && purchase.file_id && (
                      <Button asChild size="sm">
                        <Link href={`/files/${purchase.file_id}`}>
                          Open
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No purchases yet</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}