"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, FileText, Eye, AlertTriangle, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { approveBatch, rejectBatch } from "@/app/admin/uploads/actions";

export type UploadReviewBatch = {
  batchId: string;
  title: string;
  description: string | null;
  category: string;
  pricing_type: string;
  price_cents: number;
  created_at: string;
  seller: { full_name: string | null };
  files: { id: string; file_kind: string | null; file_size_bytes: number | null; page_count: number | null; file_name?: string | null }[];
};

export function UploadReviewCard({ batch }: { batch: UploadReviewBatch }) {
  const [isPending, startTransition] = useTransition();
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reason, setReason] = useState("");
  const [handled, setHandled] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      const res = await approveBatch(batch.files[0]?.id ?? "");
      if (res?.error) toast.error(res.error);
      else { toast.success(`${batch.files.length} file${batch.files.length === 1 ? "" : "s"} approved.`); setHandled(true); }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectBatch(batch.files[0]?.id ?? "", reason);
      if (res?.error) toast.error(res.error);
      else { toast.success(`${batch.files.length} file${batch.files.length === 1 ? "" : "s"} rejected.`); setHandled(true); }
    });
  }

  if (handled) return null;
  const suspicious = batch.files.some((f) => (f.file_size_bytes ?? 0) > 0 && (f.file_size_bytes ?? 0) < 30 * 1024) || batch.files.some((f) => f.page_count != null && f.page_count < 2);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted"><Files className="h-6 w-6 text-muted-foreground" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="break-words font-semibold">{batch.title}</p><Badge variant="secondary">{batch.files.length} file{batch.files.length === 1 ? "" : "s"}</Badge></div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{batch.description || "No description provided."}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{batch.category}</Badge><Badge variant={batch.pricing_type === "free" ? "success" : "default"}>{batch.pricing_type === "free" ? "Free" : formatBDT(batch.price_cents)}</Badge>{suspicious && <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Check file quality</Badge>}</div>
            <p className="mt-2 text-xs text-muted-foreground">by {batch.seller.full_name || "Seller"} · submitted {new Date(batch.created_at).toLocaleString("en-BD")}</p>
            <div className="mt-3 rounded-xl border bg-muted/20 p-3"><p className="text-xs font-semibold">Files in this upload</p><ul className="mt-2 space-y-1.5">{batch.files.map((file) => <li key={file.id} className="flex min-w-0 items-center justify-between gap-2 text-xs"><Link href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate underline-offset-2 hover:underline">{file.file_name || `${file.file_kind?.toUpperCase() || "FILE"} file`}</span></Link><span className="flex shrink-0 items-center gap-2 text-muted-foreground"><span>{file.file_kind?.toUpperCase() || "FILE"}</span><Link href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">View</Link></span></li>)}</ul></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:w-48">
          <Button size="sm" variant="secondary" asChild><a href={`/api/files/${batch.files[0]?.id}/admin-view`} target="_blank" rel="noreferrer"><Eye className="mr-1 h-4 w-4" /> View first file</a></Button>
          {!showRejectBox ? <><Button size="sm" onClick={handleApprove} disabled={isPending}><Check className="mr-1 h-4 w-4" /> Approve all</Button><Button size="sm" variant="outline" onClick={() => setShowRejectBox(true)} disabled={isPending}><X className="mr-1 h-4 w-4" /> Reject all</Button></> : <><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the seller)" rows={3} className="rounded-md border border-input bg-background px-2 py-1 text-xs"/><Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>Confirm reject</Button><Button size="sm" variant="ghost" onClick={() => setShowRejectBox(false)} disabled={isPending}>Cancel</Button></>}
        </div>
      </CardContent>
    </Card>
  );
}
