"use client";

import { useState } from "react";
import { Download, Eye, Lock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResourceDetailActions({ fileId, isFree, alreadyPurchased, paymentPending, paymentRejected, hasPreview }: { fileId: string; isFree: boolean; alreadyPurchased: boolean; paymentPending: boolean; paymentRejected: boolean; hasPreview?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const owned = isFree || alreadyPurchased;

  if (owned) return <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button asChild size="lg"><a href={`/files/${fileId}/viewer`}><Eye className="mr-2 h-4 w-4" />View resource</a></Button><Button asChild size="lg" variant="outline"><a href={`/api/files/${fileId}/download`} onClick={() => setDownloading(true)}><Download className="mr-2 h-4 w-4" />{downloading ? "Downloading…" : "Download"}</a></Button></div>;
  if (paymentPending) return <Button className="mt-5 w-full" size="lg" disabled><Lock className="mr-2 h-4 w-4" />Payment pending</Button>;
  return <div className="mt-5 grid gap-2 sm:grid-cols-2">{hasPreview && <Button asChild size="lg" variant="outline"><a href={`/files/${fileId}/viewer?preview=1`}><Eye className="mr-2 h-4 w-4" />Preview</a></Button>}<Button asChild className={hasPreview ? "w-full" : "w-full sm:col-span-2"} size="lg"><a href={`/checkout/${fileId}`}><ShoppingBag className="mr-2 h-4 w-4" />{paymentRejected ? "Try payment again" : "Buy now"}</a></Button></div>;
}
