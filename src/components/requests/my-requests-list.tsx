"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, FileCheck2, FileQuestion, ShoppingBag, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";

export type RequestItem = {
  id: string;
  type: "Seller verification" | "Resource approval" | "Purchase request" | "Payout request" | "Resource request";
  reference: string;
  amountCents?: number | null;
  submittedAt: string;
  status: string;
  tone: "pending" | "approved" | "rejected" | "completed";
  detail?: string | null;
  link?: string | null;
  estimatedHours?: number | null;
  entityId?: string | null;
  entityType?: string | null;
  timeline?: { title: string; body?: string | null; created_at: string }[];
};

const filters = ["all", "pending", "approved", "rejected"] as const;

function icon(type: RequestItem["type"]) {
  if (type === "Purchase request") return <ShoppingBag className="h-5 w-5" />;
  if (type === "Payout request") return <WalletCards className="h-5 w-5" />;
  if (type === "Resource approval") return <FileCheck2 className="h-5 w-5" />;
  if (type === "Resource request") return <FileQuestion className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5" />;
}

function statusTone(tone: RequestItem["tone"]) {
  if (tone === "approved" || tone === "completed") return "default" as const;
  if (tone === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export function MyRequestsList({ requests }: { requests: RequestItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const visible = useMemo(
    () => requests.filter((item) => filter === "all" || (filter === "approved" ? ["approved", "completed"].includes(item.tone) : item.tone === filter)),
    [filter, requests]
  );

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}>{item}</button>
        ))}
      </div>

      {visible.length ? visible.map((item) => (
        <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon(item.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{item.type}</p>
                    <h2 className="mt-0.5 break-words text-base font-bold sm:text-lg">{item.reference}</h2>
                  </div>
                  <Badge variant={statusTone(item.tone)}>{item.status}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground sm:text-sm">
                  <p>Request ID: {item.id.toString().slice(0, 12).toUpperCase()}</p>
                  <p>Submitted: {new Date(item.submittedAt).toLocaleString("en-BD")}</p>
                  {item.estimatedHours != null && item.tone === "pending" && <p className="font-medium text-foreground">Estimated response: within {item.estimatedHours} hour{item.estimatedHours === 1 ? "" : "s"}</p>}
                  {item.amountCents != null && <p className="font-medium text-foreground">Amount: {formatBDT(item.amountCents)}</p>}
                  {item.detail && <p className="break-words">{item.detail}</p>}
                  {item.timeline?.length ? <div className="mt-3 rounded-xl border bg-muted/20 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Status history</p><div className="mt-2 space-y-2">{item.timeline.map((event, index) => <div key={`${event.created_at}-${index}`} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"/><div><p className="text-xs font-medium text-foreground">{event.title}</p><p className="text-[11px] text-muted-foreground">{event.body || "Status updated"} · {new Date(event.created_at).toLocaleString("en-BD")}</p></div></div>)}</div></div> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.link && <Button asChild size="sm" variant="outline"><Link href={item.link}>Open details</Link></Button>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )) : (
        <Card><CardContent className="flex flex-col items-center p-10 text-center"><Clock3 className="h-7 w-7 text-muted-foreground" /><p className="mt-3 font-medium">No requests in this view</p><p className="mt-1 text-sm text-muted-foreground">Your sensitive requests will appear here as soon as you submit one.</p></CardContent></Card>
      )}
    </div>
  );
}
