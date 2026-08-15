import Link from "next/link";
import { CheckCircle2, Clock3, Lock, XCircle } from "lucide-react";
import { StarSummary } from "@/components/files/star-summary";
import { ResourceDetailActions } from "@/components/files/resource-detail-actions";
import { ReportResourceButton } from "@/components/files/report-resource-button";
import { formatBDT } from "@/lib/utils";

export function ResourceAccessCard({
  fileId,
  isFree,
  alreadyPurchased,
  paymentPending,
  paymentRejected,
  rejectionReason,
  price,
  rating,
  reviews,
  previewUrl,
  previewPageCount,
  pageCount,
}: {
  fileId: string;
  isFree: boolean;
  alreadyPurchased: boolean;
  paymentPending: boolean;
  paymentRejected: boolean;
  rejectionReason: string | null;
  price: number;
  rating: number;
  reviews: number;
  previewUrl: string | null;
  previewPageCount: number | null;
  pageCount: number | null;
}) {
  const canDownloadDirectly = isFree || alreadyPurchased;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource access</p>
          <p className="mt-1 text-3xl font-bold">{isFree ? "Free" : formatBDT(price)}</p>
        </div>
        <StarSummary rating={rating} count={reviews} />
      </div>

      {alreadyPurchased && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">You own this resource</p>
              <p className="mt-1 text-sm text-muted-foreground">Payment approved. View or download anytime.</p>
            </div>
          </div>
        </div>
      )}

      {paymentPending && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold">Payment pending</p>
              <p className="mt-1 text-sm text-muted-foreground">Waiting for admin verification. Please do not pay again.</p>
            </div>
          </div>
        </div>
      )}

      {paymentRejected && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold">Payment needs attention</p>
              <p className="mt-1 text-sm text-muted-foreground">{rejectionReason || "The previous payment could not be verified."}</p>
            </div>
          </div>
        </div>
      )}

      {!canDownloadDirectly && previewUrl && (
        <div className="mt-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Free preview available</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {previewPageCount && pageCount ? `${previewPageCount} of ${pageCount} pages` : "Sample preview"} before purchase.
              </p>
              <Link href={`/files/${fileId}/viewer?preview=1`} className="mt-2 inline-flex text-xs font-semibold text-primary underline">
                Open preview viewer
              </Link>
            </div>
          </div>
        </div>
      )}

      <ResourceDetailActions
        fileId={fileId}
        isFree={isFree}
        alreadyPurchased={alreadyPurchased}
        paymentPending={paymentPending}
        paymentRejected={paymentRejected}
      />

      <div className="mt-5 border-t pt-4">
        <ReportResourceButton fileId={fileId} />
      </div>
    </div>
  );
}
