import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createDeadline, deleteDeadline } from "../actions";

export default async function DeadlinesAdminPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const admin = createAdminClient();
  const { data: deadlines } = await admin
    .from("deadlines")
    .select("id,title,due_at,category,term,year")
    .order("due_at", { ascending: true })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Academic Tools & Updates</Link>
        <p className="mt-3 text-sm font-semibold text-primary">Student experience</p>
        <h2 className="text-2xl font-bold">Deadline tracker</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add or remove registration, payment and academic deadlines shown to students.</p>
        {searchParams?.saved ? <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-sm text-emerald-700">{searchParams.saved}</p> : null}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Deadlines</CardTitle></CardHeader>
        <CardContent>
          <form action={createDeadline} className="grid gap-4 sm:grid-cols-2">
            <Input name="title" placeholder="Deadline title" required />
            <Input name="category" placeholder="Category e.g. Registration" defaultValue="Academic" />
            <select name="term" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Any term</option><option>spring</option><option>summer</option><option>fall</option></select>
            <Input name="year" type="number" placeholder="Year" defaultValue={new Date().getFullYear()} />
            <Input name="due_at" type="datetime-local" required />
            <Input name="link" placeholder="Official/source link (optional)" />
            <textarea name="description" className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2" placeholder="Short description" />
            <Button type="submit" className="sm:col-span-2">Add deadline</Button>
          </form>
          <div className="mt-5 space-y-2">
            {deadlines?.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.category} · {new Date(d.due_at).toLocaleString()}</p></div>
                <form action={deleteDeadline}><input type="hidden" name="id" value={d.id} /><Button type="submit" size="sm" variant="destructive">Delete</Button></form>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
