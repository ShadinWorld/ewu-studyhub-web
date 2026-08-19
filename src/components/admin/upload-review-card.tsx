"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, FileText, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { approveFile, rejectFile } from "@/app/admin/uploads/actions";

export function UploadReviewCard({ file }: { file: any }) {
  const [isPending, startTransition] = useTransition();
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reason, setReason] = useState("");
  const [handled, setHandled] = useState(false);

  function handleApprove() {
    startTransition(async () => {
      const res = await approveFile(file.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Approved "${file.title}"`);
        setHandled(true);
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectFile(file.id, reason);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Rejected "${file.title}"`);
        setHandled(true);
      }
    });
  }

  if (handled) return null; // optimistically remove from the list

  const sizeMB = file.file_size_bytes ? file.file_size_bytes / 1024 / 1024 : 0;
  const looksSuspicious = sizeMB > 0 && sizeMB < 0.03; // <30KB — likely blank/near-empty
  const fewPages = file.page_count !== undefined && file.page_count !== null && file.page_count < 2;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="break-words font-medium">{file.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{file.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{file.category}</Badge>
              <Badge variant="secondary">{file.file_kind?.toUpperCase()}</Badge>
              <Badge variant={file.pricing_type === "free" ? "success" : "default"}>
                {file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}
              </Badge>
              {(looksSuspicious || fewPages) && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {looksSuspicious ? "Very small file — check for blank content" : "Only 1 page — verify it's not empty"}
                </Badge>
              )}
            </div>
            <p className="mt-2 break-words text-xs text-muted-foreground">
              by {file.seller?.full_name} () ·{" "}
              {file.file_size_bytes ? `${(file.file_size_bytes / 1024 / 1024).toFixed(1)}MB` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-48">
          <Button size="sm" variant="secondary" asChild>
            <a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer">
              <Eye className="mr-1 h-4 w-4" /> View file
            </a>
          </Button>
          {!showRejectBox ? (
            <>
              <Button size="sm" onClick={handleApprove} disabled={isPending}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowRejectBox(true)} disabled={isPending}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          ) : (
            <>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (shown to the seller)"
                rows={2}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>
                Confirm reject
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRejectBox(false)} disabled={isPending}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
