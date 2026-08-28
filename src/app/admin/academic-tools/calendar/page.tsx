import Link from "next/link";
import { ArrowLeft, CalendarDays, ClipboardCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadAcademicDocument } from "../actions";

export default async function AcademicCalendarAdminPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("academic_documents")
    .select("id,document_type,term,year,title,mime_type,file_size_bytes,created_at")
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Academic Tools & Updates</Link>
        <p className="mt-3 text-sm font-semibold text-primary">Student experience</p>
        <h2 className="text-2xl font-bold">Academic calendar & final exam PDFs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload or replace the current academic calendar and final exam schedule documents.</p>
        {searchParams?.saved ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Upload document</CardTitle></CardHeader>
        <CardContent>
          <form action={uploadAcademicDocument} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Document type</Label><select name="document_type" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="academic_calendar">Academic Calendar</option><option value="final_exam_schedule">Final Exam Schedule</option></select></div>
            <div className="space-y-2"><Label>Term</Label><select name="term" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option>spring</option><option>summer</option><option>fall</option></select></div>
            <div className="space-y-2"><Label>Year</Label><Input name="year" type="number" defaultValue={new Date().getFullYear()} min="2020" max="2100" /></div>
            <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Summer 2026 Final Exam Schedule" required /></div>
            <div className="space-y-2 sm:col-span-2"><Label>PDF or image</Label><Input name="file" type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/gif" required /><p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP or GIF · max 30 MB</p></div>
            <div className="sm:col-span-2"><Button type="submit"><ClipboardCheck className="h-4 w-4" />Upload / replace</Button></div>
          </form>
          <div className="mt-5 space-y-2">
            {documents?.map((d) => (
              <div key={d.id} className="flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.document_type.replaceAll("_", " ")} · {d.term} {d.year} · {d.mime_type === "application/pdf" ? "PDF" : "Image"}{d.file_size_bytes ? ` · ${(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}</p></div>
                <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
