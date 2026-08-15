"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveReport, dismissReport } from "@/app/admin/reports/actions";

const REASON_LABELS: Record<string, string> = {
  wrong_course: "Wrong course",
  fake_file: "Fake file",
  duplicate: "Duplicate",
  blank_pdf: "Blank PDF",
  copyright: "Copyright",
  spam: "Spam",
  other: "Other",
};

export function ReportReviewCard({ report }: { report: any }) {
  const [isPending, startTransition] = useTransition();
  const [handled, setHandled] = useState(false);
  if (handled) return null;

  function act(fn: () => Promise<any>, successMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(successMsg);
        setHandled(true);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="destructive">{REASON_LABELS[report.reason] ?? report.reason}</Badge>
            <Link href={`/files/${report.file?.id}`} className="text-sm font-medium hover:underline" target="_blank">
              {report.file?.title}
            </Link>
          </div>
          {report.details && <p className="text-sm text-muted-foreground">{report.details}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            Reported by {report.reporter?.full_name} ()
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => act(() => resolveReport(report.id, true), "File removed")}
          >
            Remove file
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => act(() => resolveReport(report.id, false), "Marked resolved")}
          >
            Resolve (keep file)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => act(() => dismissReport(report.id), "Dismissed")}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
