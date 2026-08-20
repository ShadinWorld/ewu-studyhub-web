"use client";

import { Clock3, Download, Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";

export function StickyResourceActionBar({
  fileId,
  isFree,
  alreadyPurchased,
  paymentPending,
  paymentRejected,
  price,
  hasPreview,
}: {
  fileId: string;
  isFree: boolean;
  alreadyPurchased: boolean;
  paymentPending: boolean;
  paymentRejected: boolean;
  price: number;
  hasPreview?: boolean;
}) {
  const owned = isFree || alreadyPurchased;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-2.5 shadow-2xl backdrop-blur lg:hidden">
      <div className="container flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-muted-foreground">{owned ? "Owned" : paymentPending ? "Payment pending" : "Price"}</p>
          <p className="truncate text-sm font-bold">{owned ? "Ready to access" : paymentPending ? "Waiting for admin" : formatBDT(price)}</p>
        </div>
        {owned ? (
          <>
            <Button asChild size="sm" variant="outline"><a href={`/files/${fileId}/viewer`}><Eye className="mr-1 h-4 w-4" />View</a></Button>
            <Button asChild size="sm"><a href={`/api/files/${fileId}/download`}><Download className="mr-1 h-4 w-4" />Download</a></Button>
          </>
        ) : paymentPending ? (
          <Button size="sm" disabled><Clock3 className="mr-1 h-4 w-4" />Pending</Button>
        ) : (
          <>
            {hasPreview && <Button asChild size="sm" variant="outline"><a href={`/files/${fileId}/viewer?preview=1`}><Eye className="mr-1 h-4 w-4" />Preview</a></Button>}
            <Button asChild size="sm"><a href={`/checkout/${fileId}`}><ShoppingBag className="mr-1 h-4 w-4" />{paymentRejected ? "Buy again" : "Buy now"}</a></Button>
          </>
        )}
      </div>
    </div>
  );
}
