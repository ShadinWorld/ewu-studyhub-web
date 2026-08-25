"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, FileText, Eye, AlertTriangle, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/utils";
import { AIResourceReviewButton } from "@/components/admin/ai-resource-review-button";
import { approveBatch, rejectBatch, regroupPendingBatch } from "@/app/admin/uploads/actions";

export type UploadReviewBatch = {
  batchId: string;
  title: string;
  description: string | null;
  category: string;
  pricing_type: string;
  price_cents: number;
  created_at: string;
  seller: { full_name: string | null };
  files: { id: string; file_kind: string | null; file_size_bytes: number | null; page_count: number | null; file_name?: string | null; ai?: { status: string | null; ai_confidence: number | null; ai_group_type: string | null; moderation_risk_score: number | null; moderation_summary: string | null; moderation_flags: string[] | null; ai_group_conflicts: string[] | null; moderation_reviewed_at: string | null } | null }[];
};

export function UploadReviewCard({ batch }: { batch: UploadReviewBatch }) {
  const [isPending, startTransition] = useTransition();
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [reason, setReason] = useState("");
  const [handled, setHandled] = useState(false);
  const [groupingOpen, setGroupingOpen] = useState(false);
  const [groups, setGroups] = useState<Record<string, string>>(() => Object.fromEntries(batch.files.map((file) => [file.id, "1"])));

  function handleApprove() {
    startTransition(async () => {
      const res = await approveBatch(batch.files[0]?.id ?? "");
      if (res?.error) toast.error(res.error);
      else { toast.success(`${batch.files.length} file${batch.files.length === 1 ? "" : "s"} approved.`); setHandled(true); }
    });
  }

  function handleRegroup() {
    if (batch.files.length < 2 || isPending) return;
    startTransition(async () => {
      const orderedGroups = batch.files.map((file) => groups[file.id] || "1");
      const result = await regroupPendingBatch(batch.files.map((file) => file.id), orderedGroups);
      if (result?.error) toast.error(result.error);
      else { toast.success("Pending resource grouping updated. It will be reviewed as separate resource group(s)."); setGroupingOpen(false); }
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
            <div className="mt-3 rounded-xl border bg-background p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">System AI review</span>{batch.files[0]?.ai ? <><Badge variant="outline">{batch.files[0]?.ai.ai_group_type === "related_bundle" ? "Related bundle" : batch.files[0]?.ai.ai_group_type === "mixed_bundle" ? "Mixed files" : "Single file"}</Badge><Badge variant={Number(batch.files[0]?.ai.moderation_risk_score || 0) >= 60 ? "destructive" : "secondary"}>Risk {Math.round(Number(batch.files[0]?.ai.moderation_risk_score || 0))}/100</Badge><Badge variant="outline">Confidence {Math.round(Number(batch.files[0]?.ai.ai_confidence || 0) * 100)}%</Badge></> : <Badge variant="secondary">Analysis pending</Badge>}</div>{batch.files[0]?.ai?.moderation_summary && <p className="mt-1 text-xs leading-5 text-muted-foreground">{batch.files[0].ai.moderation_summary}</p>}{batch.files[0]?.ai?.moderation_flags?.length ? <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Flags: {batch.files[0].ai.moderation_flags.slice(0, 3).join(" · ")}</p> : null}<div className="mt-2"><AIResourceReviewButton id={batch.files[0]?.id ?? ""} analysisReady={Boolean(batch.files[0]?.ai)} /></div></div>
            <div className="mt-3 rounded-xl border bg-muted/20 p-3"><p className="text-xs font-semibold">Files in this upload</p><ul className="mt-2 space-y-1.5">{batch.files.map((file) => <li key={file.id} className="flex min-w-0 items-center justify-between gap-2 text-xs"><Link href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-accent"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate underline-offset-2 hover:underline">{file.file_name || `${file.file_kind?.toUpperCase() || "FILE"} file`}</span></Link><span className="flex shrink-0 items-center gap-2 text-muted-foreground"><span>{file.file_kind?.toUpperCase() || "FILE"}</span><Link href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">View</Link></span></li>)}</ul></div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:w-48">
          <Button size="sm" variant="secondary" asChild><a href={`/api/files/${batch.files[0]?.id}/admin-view`} target="_blank" rel="noreferrer"><Eye className="mr-1 h-4 w-4" /> View first file</a></Button>
          {batch.files.length > 1 && <Button size="sm" variant="outline" onClick={() => setGroupingOpen((value) => !value)} disabled={isPending}><Files className="mr-1 h-4 w-4" /> {groupingOpen ? "Close regroup" : "Regroup files"}</Button>}
          {groupingOpen && <div className="rounded-xl border bg-muted/20 p-3 text-xs"><p className="font-semibold">Group files before approval</p><p className="mt-1 text-muted-foreground">Use the same number for files that should stay together. This only works while the request is pending.</p><div className="mt-2 space-y-2">{batch.files.map((file, index) => <div key={file.id} className="flex items-center justify-between gap-2"><span className="min-w-0 flex-1 truncate">{file.file_name || `File ${index + 1}`}</span><select value={groups[file.id] || "1"} onChange={(e) => setGroups((current) => ({ ...current, [file.id]: e.target.value }))} className="h-8 w-20 rounded-md border bg-background px-2"><option value="1">Group 1</option><option value="2">Group 2</option><option value="3">Group 3</option></select></div>)}</div><Button size="sm" onClick={handleRegroup} disabled={isPending}>Apply grouping</Button></div>}
          {!showRejectBox ? <><Button size="sm" onClick={handleApprove} disabled={isPending}><Check className="mr-1 h-4 w-4" /> Approve all</Button><Button size="sm" variant="outline" onClick={() => setShowRejectBox(true)} disabled={isPending}><X className="mr-1 h-4 w-4" /> Reject all</Button></> : <><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the seller)" rows={3} className="rounded-md border border-input bg-background px-2 py-1 text-xs"/><Button size="sm" variant="destructive" onClick={handleReject} disabled={isPending}>Confirm reject</Button><Button size="sm" variant="ghost" onClick={() => setShowRejectBox(false)} disabled={isPending}>Cancel</Button></>}
        </div>
      </CardContent>
    </Card>
  );
}
