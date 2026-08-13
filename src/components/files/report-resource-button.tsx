"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { createResourceReport } from "@/app/files/[id]/report-actions";
import { Button } from "@/components/ui/button";

export function ReportResourceButton({ fileId }: { fileId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) return <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}><Flag className="mr-2 h-4 w-4" />Report resource</Button>;

  return (
    <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
      <p className="text-sm font-semibold">Report this resource</p>
      <p className="mt-1 text-xs text-muted-foreground">Tell the admin what is wrong. Your report will be reviewed.</p>
      <form action={(formData) => { startTransition(async () => { try { await createResourceReport(formData); toast.success("Report sent to admin."); setOpen(false); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send report."); } }); }} className="mt-3 space-y-3">
        <input type="hidden" name="file_id" value={fileId} />
        <select name="reason" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="wrong_course">Wrong course</option><option value="fake_file">Fake / misleading file</option><option value="duplicate">Duplicate</option><option value="blank_pdf">Blank / broken file</option><option value="copyright">Copyright issue</option><option value="spam">Spam</option><option value="other">Other</option></select>
        <textarea name="details" required rows={3} maxLength={2000} placeholder="What should the admin check?" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <div className="flex gap-2"><Button type="submit" disabled={pending}>{pending ? "Sending..." : "Send report"}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
      </form>
    </div>
  );
}
