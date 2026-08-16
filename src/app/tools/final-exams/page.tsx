import { ClipboardCheck, Download } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const terms = ["spring","summer","fall"] as const;
export default async function FinalExamsPage({ searchParams }: { searchParams: { term?: string; year?: string } }) {
  const year = Number(searchParams.year) || new Date().getFullYear();
  const termCandidate = (searchParams.term ?? "summer").toLowerCase();
  const term = terms.includes(termCandidate as typeof terms[number]) ? (termCandidate as typeof terms[number]) : "summer";
  const supabase = createClient();
  const { data: rows } = await supabase.from("academic_documents").select("id, term, year, title, storage_path, created_at").eq("document_type","final_exam_schedule").eq("is_active",true).eq("term",term).eq("year",year).order("created_at",{ascending:false}).limit(1);
  const row = rows?.[0];
  const url = row ? (await createAdminClient().storage.from("admin-documents").createSignedUrl(row.storage_path,900)).data?.signedUrl : null;
  return <div className="flex min-h-screen flex-col"><Navbar/><main className="container flex-1 py-8 sm:py-12"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Exam planning</p><h1 className="mt-1 text-3xl font-bold">Final Exam Schedule</h1><p className="mt-2 text-sm text-muted-foreground">Choose the semester and year. The admin can replace the PDF when EWU publishes a revised schedule.</p></div><div className="mt-6 flex gap-2 overflow-x-auto pb-1">{terms.map(t=><a key={t} href={`/tools/final-exams?term=${t}&year=${year}`} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${term===t?"border-primary bg-primary/10 text-primary":"hover:bg-accent"}`}>{t[0].toUpperCase()+t.slice(1)} {year}</a>)}</div><div className="mt-6">{row&&url?<Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck className="h-5 w-5"/></div><div><p className="font-semibold">{row.title}</p><p className="text-sm text-muted-foreground">{term[0].toUpperCase()+term.slice(1)} {year} · Final Exam Schedule</p></div></div><Button asChild><a href={url} target="_blank" rel="noreferrer"><Download className="h-4 w-4"/>Open PDF</a></Button></CardContent></Card>:<Card><CardContent className="p-8 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground"/><p className="mt-3 font-semibold">No schedule uploaded for {term} {year}.</p><p className="mt-1 text-sm text-muted-foreground">Try another semester or check back after the admin uploads the latest PDF.</p></CardContent></Card>}</div></main><Footer/></div>;
}
