import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GradeCalculatorAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools/student-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Student Academic Tools
        </Link>
        <p className="mt-3 text-sm font-semibold text-primary">Tool management</p>
        <h2 className="text-2xl font-bold">Grade Calculator</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">This tool performs the calculation in the student's browser and does not store course-grade data. There are no saved records to add or delete here.</p>
      </div>
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Calculator className="h-5 w-5" /></div>
          <div>
            <p className="font-semibold">What Admin can control</p>
            <p className="mt-1 text-sm text-muted-foreground">Use the Student Academic Tool Manager to add or remove this tool from the Student Tools directory. The calculator's default component rows and grade thresholds are currently part of the tool code; no database content exists to delete.</p>
            <Link href="/admin/academic-tools/student-tools" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Open Tool Manager →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
