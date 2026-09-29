import Link from "next/link";
import { ArrowLeft, ExternalLink, Plus, ToggleLeft, Trash2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudentTool, deleteStudentTool, toggleStudentTool } from "./actions";

const icons = ["CalendarDays", "ClipboardCheck", "FileClock", "FileQuestion", "GraduationCap", "Calculator", "BookOpen", "Clock3", "SearchCheck", "Lightbulb", "Wrench"];

export default async function AdminStudentToolsManager({ searchParams }: { searchParams: { saved?: string } }) {
  const admin = createAdminClient();
  const { data: tools, error } = await admin
    .from("student_tool_catalog")
    .select("id,slug,title,description,href,icon,is_active,is_builtin,display_order,open_in_new_tab,created_at")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/academic-tools" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Academic Tools & Updates
        </Link>
        <p className="mt-4 text-sm font-semibold text-primary">Student experience</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Student Academic Tool Manager</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Add new tool links or remove existing tools from the Student Tools directory. Removing a built-in tool only hides it from students; the underlying feature is not deleted.
            </p>
          </div>
          <span className="rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {tools?.filter(t => t.is_active).length ?? 0} active
          </span>
        </div>
      </div>

      {searchParams.saved ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">{searchParams.saved}</div> : null}
      {error ? <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Student tool catalog is not available yet. Apply migration <span className="font-mono">0053_admin_managed_student_tools.sql</span>.</div> : null}

      <Card>
        <CardHeader><CardTitle>Add Student Academic Tool</CardTitle></CardHeader>
        <CardContent>
          <form action={createStudentTool} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" placeholder="e.g. Department Notice Board" required maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="href">Tool link</Label><Input id="href" name="href" placeholder="/tools/example or https://example.com" required /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="description">Description</Label><Input id="description" name="description" placeholder="Short explanation shown to students" maxLength={500} /></div>
            <div className="space-y-2"><Label htmlFor="icon">Icon</Label><select id="icon" name="icon" defaultValue="GraduationCap" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{icons.map(icon => <option key={icon} value={icon}>{icon}</option>)}</select></div>
            <div className="flex items-end"><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="open_in_new_tab" value="true" /> Open external link in new tab</label></div>
            <div className="sm:col-span-2"><Button type="submit"><Plus className="h-4 w-4" />Add tool</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {(tools ?? []).map(tool => (
          <Card key={tool.id} className={!tool.is_active ? "opacity-65" : undefined}>
            <CardContent className="flex h-full flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{tool.title}</p>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">{tool.is_builtin ? "Built-in" : "Custom"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tool.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{tool.is_active ? "Visible to students" : "Removed"}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tool.description || "No description"}</p>
                </div>
                <span className="rounded-lg bg-primary/10 p-2 text-primary"><ToggleLeft className="h-4 w-4" /></span>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Link:</span> {tool.href}{tool.open_in_new_tab ? " · new tab" : ""}</div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><a href={tool.href} target={tool.open_in_new_tab ? "_blank" : undefined} rel={tool.open_in_new_tab ? "noreferrer" : undefined}><ExternalLink className="h-4 w-4" />Open</a></Button>
                <form action={toggleStudentTool}><input type="hidden" name="id" value={tool.id} /><Button type="submit" size="sm" variant={tool.is_active ? "secondary" : "default"}>{tool.is_active ? "Remove from students" : "Add to students"}</Button></form>
                {!tool.is_builtin ? <form action={deleteStudentTool}><input type="hidden" name="id" value={tool.id} /><Button type="submit" size="sm" variant="outline" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Delete</Button></form> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
