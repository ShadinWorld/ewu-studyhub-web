"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type RequestRow = { id: string; title: string; status: string; details: string | null; admin_note?: string | null; created_at: string; course_code?: string | null };
type HistoryRow = { id: string; action: string; description: string | null; created_at: string };

export function StudentResourceRequestDetails({ requests, historyMap = {} }: { requests: RequestRow[]; historyMap?: Record<string, HistoryRow[]> }) {
  const [selected, setSelected] = useState<RequestRow | null>(null);
  return <>{requests.length ? requests.map((request) => <div key={request.id} className="rounded-xl border p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="font-medium">{request.title}</p><p className="text-xs text-muted-foreground">{request.course_code || "General"} · {new Date(request.created_at).toLocaleDateString()}</p><Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => setSelected(request)}>View details</Button></div>
      <span className="rounded-full border px-2 py-1 text-[11px] font-semibold capitalize">{String(request.status).replaceAll("_", " ")}</span>
    </div>
  </div>) : <p className="text-sm text-muted-foreground">No requests yet.</p>}
  {selected ? <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
    <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource request</p><h3 className="mt-1 text-xl font-bold">{selected.title}</h3></div><Button type="button" variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close"><X className="h-5 w-5" /></Button></div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Info label="Course" value={selected.course_code || "General"}/><Info label="Request ID" value={selected.id}/><Info label="Status" value={String(selected.status).replaceAll("_", " ")}/><Info label="Submitted" value={new Date(selected.created_at).toLocaleString("en-BD")}/><Info label="Details" value={selected.details || "No details supplied."} full/>{selected.admin_note ? <Info label="Admin note" value={selected.admin_note} full/> : null}</div>
      <div className="mt-6"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status history</p><div className="mt-3 space-y-3">{(historyMap[selected.id] ?? []).length ? historyMap[selected.id]!.map((e) => <div key={e.id} className="rounded-lg border bg-muted/20 p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium capitalize">{e.action.replaceAll("_", " ")}</p><span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-BD")}</span></div>{e.description ? <p className="mt-1 text-sm text-muted-foreground">{e.description}</p> : null}</div>) : <p className="text-sm text-muted-foreground">No status history recorded yet.</p>}</div></div>
      <div className="mt-5 flex justify-end"><Button type="button" onClick={() => setSelected(null)}>Close</Button></div>
    </div></div> : null}</>;
}
function Info({ label, value, full = false }: { label: string; value: string; full?: boolean }) { return <div className={full ? "sm:col-span-2" : ""}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div>; }
