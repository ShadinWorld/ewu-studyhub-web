import { SearchCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PrerequisiteCheckerPage({ searchParams }: { searchParams: { course?: string } }) {
  const supabase = createClient();
  const { data: courses } = await supabase.from("courses").select("id, course_code, course_name, credit").order("course_code");
  const selected = courses?.find(c => c.id === searchParams.course) ?? courses?.find(c => c.course_code.toLowerCase() === String(searchParams.course ?? "").toLowerCase());
  const { data: prereqs } = selected ? await supabase.from("course_prerequisites").select("prerequisite_course_id").eq("course_id", selected.id) : { data: [] as { prerequisite_course_id: string }[] };
  const ids = (prereqs ?? []).map(p=>p.prerequisite_course_id);
  const prerequisiteCourses = ids.length ? (courses ?? []).filter(c=>ids.includes(c.id)) : [];
  return <div className="flex min-h-screen flex-col"><Navbar/><main className="container flex-1 py-8 sm:py-12"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Course planning</p><h1 className="mt-1 text-3xl font-bold">Prerequisite Checker</h1><p className="mt-2 text-sm text-muted-foreground">Select a course to see the prerequisite courses configured by StudyHub admins.</p></div><form className="mt-6 flex gap-2" action="/tools/prerequisite-checker"><select name="course" defaultValue={selected?.id ?? ""} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"><option value="">Select a course</option>{(courses ?? []).map(c=><option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>)}</select><Button type="submit">Check</Button></form>{selected&&<Card className="mt-6"><CardContent className="p-5"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><SearchCheck className="h-5 w-5"/></div><div><p className="font-mono text-xs font-bold text-primary">{selected.course_code}</p><h2 className="mt-1 text-xl font-bold">{selected.course_name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.credit ?? "—"} credits</p></div></div><div className="mt-6 border-t pt-5"><p className="font-semibold">Prerequisites</p>{prerequisiteCourses.length?<div className="mt-3 space-y-2">{prerequisiteCourses.map(c=><Link key={c.id} href={`/course/${c.id}`} className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent"><span><span className="font-mono text-xs font-bold text-primary">{c.course_code}</span><span className="ml-2 text-sm">{c.course_name}</span></span><span className="text-xs text-muted-foreground">Open</span></Link>)}</div>:<p className="mt-2 text-sm text-muted-foreground">No prerequisite has been configured for this course.</p>}</div></CardContent></Card>}</main><Footer/></div>;
}
