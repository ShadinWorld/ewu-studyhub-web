import { FileText, Download, CalendarDays } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AcademicCalendarPage() {
  const supabase = createClient();
  const { data: rows } = await supabase.from("academic_documents").select("id, document_type, term, year, title, storage_path, file_size_bytes, created_at").eq("document_type", "academic_calendar").eq("is_active", true).order("year", { ascending: false }).order("created_at", { ascending: false });
  const admin = createAdminClient();
  const docs = await Promise.all((rows ?? []).map(async (row) => ({ ...row, url: (await admin.storage.from("admin-documents").createSignedUrl(row.storage_path, 900)).data?.signedUrl ?? null })));
  return <div className="flex min-h-screen flex-col"><Navbar/><main className="container flex-1 py-8 sm:py-12"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Academic dates</p><h1 className="mt-1 text-3xl font-bold">Academic Calendar</h1><p className="mt-2 text-sm text-muted-foreground">Open the latest calendar for Spring, Summer or Fall.</p></div><div className="mt-8 space-y-3">{docs.length ? docs.map(doc=><Card key={doc.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="h-5 w-5"/></div><div className="min-w-0"><p className="font-semibold">{doc.term[0].toUpperCase()+doc.term.slice(1)} {doc.year}</p><p className="truncate text-sm text-muted-foreground">{doc.title} · PDF</p></div></div>{doc.url&&<Button asChild><a href={doc.url} target="_blank" rel="noreferrer"><Download className="h-4 w-4"/>Open PDF</a></Button>}</CardContent></Card>) : <Card><CardHeader><CardTitle>No calendar uploaded yet</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">The admin can upload the current EWU calendar from the Academic Tools panel.</CardContent></Card>}</div></main><Footer/></div>;
}
