import Link from "next/link";
import { CheckCircle2, Clock3, FileUp, ShoppingBag, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";

export type ActionStatus = {
  id: string;
  kind: "resource" | "payment" | "payout" | "seller";
  title: string;
  statusLabel: string;
  submittedAt: string;
  link: string;
  amountCents?: number | null;
  detail?: string | null;
};

function icon(kind: ActionStatus["kind"]) {
  if (kind === "resource") return <FileUp className="h-5 w-5" />;
  if (kind === "payment") return <ShoppingBag className="h-5 w-5" />;
  if (kind === "payout") return <WalletCards className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5" />;
}

export function ActionStatusPanel({ actions }: { actions: ActionStatus[] }) {
  if (!actions.length) {
    return (
      <Card className="mt-6 border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">No pending actions</p>
            <p className="mt-1 text-sm text-muted-foreground">There are no seller verification, resource approval, payment or payout requests waiting for review.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Action status</p>
          <h2 className="mt-1 text-lg font-bold sm:text-xl">Requests waiting for admin</h2>
          <p className="mt-1 text-sm text-muted-foreground">These stay here as pending until an admin approves or rejects them.</p>
        </div>
        <Badge variant="secondary">{actions.length} pending</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action) => (
          <Card key={action.id} className="border-amber-500/25 bg-background/80">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  {icon(action.kind)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{action.title}</p>
                    <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500"><Clock3 className="h-3 w-3" />Pending</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{action.statusLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Submitted: {new Date(action.submittedAt).toLocaleString("en-BD")}</p>
                  {action.amountCents != null && <p className="mt-1 text-sm font-medium">Amount: {formatBDT(action.amountCents)}</p>}
                  {action.detail && <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={action.link}>View</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
