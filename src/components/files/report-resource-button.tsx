"use client";

import { useState, useTransition } from "react";
import { Flag, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createResourceReport } from "@/app/files/[id]/report-actions";
import { Button } from "@/components/ui/button";

const reasons = [
  ["wrong_course", "Wrong course or category"],
  ["fake_file", "Fake or misleading resource"],
  ["duplicate", "Duplicate resource"],
  ["blank_pdf", "Blank or broken file"],
  ["copyright", "Copyright issue"],
  ["spam", "Spam or inappropriate content"],
  ["other", "Other"],
] as const;

export function ReportResourceButton({ fileId }: { fileId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createResourceReport(formData);
        toast.success("Report sent to the StudyHub admin.");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send report.");
      }
    });
  };

  return <>
    <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}><Flag className="mr-2 h-4 w-4" />Report resource</Button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"><div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><h2 id="report-title" className="text-lg font-bold">Report this resource</h2></div><p className="mt-1 text-sm text-muted-foreground">Choose the closest reason. The admin will review your report.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Close"><X className="h-4 w-4" /></button></div><form action={submit} className="mt-5 space-y-4"><input type="hidden" name="file_id" value={fileId} /><div><label htmlFor="report-reason" className="text-sm font-medium">Reason</label><select id="report-reason" name="reason" required className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label htmlFor="report-details" className="text-sm font-medium">What should the admin check?</label><textarea id="report-details" name="details" required minLength={3} maxLength={2000} rows={4} placeholder="Briefly explain what is wrong..." className="mt-2 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={pending}>{pending ? "Sending report…" : "Send report"}</Button></div></form></div></div>}
  </>;
}
