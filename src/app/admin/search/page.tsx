import Link from "next/link";
import { Search, Users, BookOpen, Files } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminSearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = String(searchParams.q ?? "").trim();
  const term = q.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
  const admin = createAdminClient();
  const [{ data: users }, { data: resources }, { data: courses }] = term ? await Promise.all([
    admin.from("profiles").select("id, full_name, role, phone_number, university_email, student_id_verification_status").or(`full_name.ilike.%${term}%,university_email.ilike.%${term}%,phone_number.ilike.%${term}%,student_id.ilike.%${term}%`).limit(20),
    admin.from("files").select("id, title, visibility, pricing_type, price_cents, category").or(`title.ilike.%${term}%,description.ilike.%${term}%`).limit(20),
    admin.from("courses").select("id, course_code, course_name, department:departments(short_name,name)").or(`course_code.ilike.%${term}%,course_name.ilike.%${term}%`).limit(20),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-sm font-semibold text-primary">Admin tools</p><h2 className="text-2xl font-bold">Global search</h2><p className="mt-1 text-sm text-muted-foreground">Search users, resources and courses from one place.</p></div>
    <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Search name, email, phone, CSE303, resource title..." autoFocus /><Button type="submit"><Search className="h-4 w-4" />Search</Button></form>
    {!q ? <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Start typing to search the marketplace.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-3">
      <ResultCard title="Users" icon={<Users className="h-4 w-4" />} empty="No users found.">{(users as any[]).map((u) => <Link key={u.id} href={`/admin/users?user=${u.id}`} className="block rounded-xl border p-3 hover:border-primary/40"><p className="font-semibold">{u.full_name || "Unnamed user"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{u.university_email || "No EWU email"}</p><p className="mt-1 text-xs capitalize">{String(u.role).replaceAll("_", " ")} · {u.student_id_verification_status}</p></Link>)}</ResultCard>
      <ResultCard title="Courses" icon={<BookOpen className="h-4 w-4" />} empty="No courses found.">{(courses as any[]).map((c) => <Link key={c.id} href={`/course/${c.id}`} className="block rounded-xl border p-3 hover:border-primary/40"><p className="font-semibold">{c.course_code}</p><p className="mt-1 text-xs text-muted-foreground">{c.course_name}</p><p className="mt-1 text-xs text-primary">{c.department?.short_name || c.department?.name || "Department"}</p></Link>)}</ResultCard>
      <ResultCard title="Resources" icon={<Files className="h-4 w-4" />} empty="No resources found.">{(resources as any[]).map((r) => <div key={r.id} className="rounded-xl border p-3"><p className="font-semibold">{r.title}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{r.category?.replaceAll("_", " ")} · {r.visibility}</p><Button variant="link" size="sm" asChild className="mt-1 h-auto px-0"><a href={`/api/files/${r.id}/admin-view`} target="_blank" rel="noreferrer">Open resource</a></Button></div>)}</ResultCard>
    </div>}
  </div>;
}

function ResultCard({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: string; children: React.ReactNode }) {
  const array = Array.isArray(children) ? children : children ? [children] : [];
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle></CardHeader><CardContent className="space-y-2">{array.length ? array : <p className="text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}
