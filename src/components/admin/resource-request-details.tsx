"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RequestRow = {
  id: string;
  title: string;
  status: string;
  details: string | null;
  admin_note: string | null;
  created_at: string;
  user_id: string;
  course_id: string | null;
};

type Props = {
  requests: RequestRow[];
  profileMap: Record<string, string>;
  courseMap: Record<string, string>;
  updateRequestStatus: (formData: FormData) => Promise<void>;
  historyMap?: Record<string, Array<{ id: string; action: string; description: string | null; created_at: string; metadata?: unknown }>>;
  returnTo?: string;
};

export function ResourceRequestDetails({ requests, profileMap, courseMap, updateRequestStatus, historyMap = {}, returnTo = "/admin/academic-tools" }: Props) {
  const [selected, setSelected] = useState<RequestRow | null>(null);

  return (
    <div className="space-y-3">
      {requests.length ? requests.map((request) => (
        <div key={request.id} className="rounded-xl border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">{request.title}</p>
              <p className="text-xs text-muted-foreground">
                {request.course_id ? courseMap[request.course_id] ?? "General" : "General"} · {profileMap[request.user_id] ?? "Student"} · {new Date(request.created_at).toLocaleDateString()}
              </p>
              <Button type="button" variant="link" className="mt-1 h-auto p-0 text-xs" onClick={() => setSelected(request)}>
                View details
              </Button>
            </div>
            <span className="rounded-full border px-2 py-1 text-[11px] font-semibold capitalize">{String(request.status).replace("_", " ")}</span>
          </div>
          <form action={updateRequestStatus} className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
            <input type="hidden" name="id" value={request.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <select name="status" defaultValue={request.status} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="closed">Closed</option>
            </select>
            <Input name="admin_note" defaultValue={request.admin_note ?? ""} placeholder="Admin note" />
            <Button type="submit">Update</Button>
          </form>
        </div>
      )) : <p className="text-sm text-muted-foreground">No resource requests.</p>}

      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Resource request details" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource request</p>
                <h3 className="mt-1 text-xl font-bold">{selected.title}</h3>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close details"><X className="h-5 w-5" /></Button>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Requester" value={profileMap[selected.user_id] ?? "Student"} />
              <Info label="Course" value={selected.course_id ? courseMap[selected.course_id] ?? "General" : "General"} />
              <Info label="Request ID" value={selected.id} />
              <Info label="Status" value={String(selected.status).replace("_", " ")} />
              <Info label="Submitted" value={new Date(selected.created_at).toLocaleString("en-BD")} />
              <Info label="Details" value={selected.details || "No requester details supplied."} full />
              {selected.admin_note ? <Info label="Admin note" value={selected.admin_note} full /> : null}
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status history</p>
              <div className="mt-3 space-y-3">
                {(historyMap[selected.id] ?? []).length ? (historyMap[selected.id]!.map((event) => (
                  <div key={event.id} className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{event.action.replaceAll("_", " ")}</p>
                      <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("en-BD")}</span>
                    </div>
                    {event.description ? <p className="mt-1 text-sm text-muted-foreground">{event.description}</p> : null}
                  </div>
                ))) : <p className="text-sm text-muted-foreground">No status history recorded yet.</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Info({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div>;
}
