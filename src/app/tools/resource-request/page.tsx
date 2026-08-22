import { FileQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StudentResourceRequestDetails } from "@/components/resource-request/student-resource-request-details";
import { createResourceRequest } from "./actions";

export default async function ResourceRequestPage(){
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:courses},{data:requests}]=await Promise.all([
    supabase.from("courses").select("id,course_code,course_name").order("course_code"),
    user?supabase.from("resource_requests").select("id,title,status,created_at,courses(course_code)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10):Promise.resolve({data:[] as any[]})
  ]);
  const latest = requests?.[0]?.created_at ? new Date(requests[0].created_at).getTime() : 0;
  const nextAllowedAt = latest ? latest + 3*24*60*60*1000 : 0;
  const cooldownActive = Boolean(nextAllowedAt && nextAllowedAt > Date.now());
  const remainingHours = cooldownActive ? Math.ceil((nextAllowedAt - Date.now()) / 3600000) : 0;
  const requestIds = (requests ?? []).map((r:any) => r.id);
  const { data: historyRows } = user && requestIds.length
    ? await supabase.from("user_activity_history").select("id,entity_id,action,description,created_at").eq("entity_type", "resource_request").in("entity_id", requestIds).order("created_at", { ascending: true })
    : { data: [] as any[] };
  const historyMap = (historyRows ?? []).reduce<Record<string, any[]>>((acc, row) => { (acc[row.entity_id] ??= []).push(row); return acc; }, {});
  return <div className="flex min-h-screen flex-col"><Navbar/><main className="container flex-1 py-8 sm:py-12"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">Community request</p><h1 className="mt-1 text-3xl font-bold">Request a Resource</h1><p className="mt-2 text-sm text-muted-foreground">Tell us what you need. You can submit one request every 3 days.</p></div>{user?<Card className="mt-8 max-w-2xl"><CardContent className="p-5 sm:p-6">{cooldownActive&&<div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><p className="font-semibold text-amber-800 dark:text-amber-200">Request limit reached</p><p className="mt-1 text-muted-foreground">You can submit your next resource request in about {remainingHours} hour{remainingHours===1?"":"s"}.</p></div>}<form action={createResourceRequest} className="space-y-5"><div className="space-y-2"><Label htmlFor="course_id">Course</Label><select id="course_id" name="course_id" disabled={cooldownActive} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Not sure / general</option>{(courses??[]).map(c=><option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="title">What resource do you need?</Label><Input id="title" name="title" disabled={cooldownActive} placeholder="e.g. CSE303 final questions 2025" required/></div><div className="space-y-2"><Label htmlFor="details">Details</Label><textarea id="details" name="details" disabled={cooldownActive} rows={5} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Mention topic, semester, teacher, year or any useful detail."/></div><Button type="submit" disabled={cooldownActive}><FileQuestion className="h-4 w-4"/>{cooldownActive?"Request unavailable":"Submit request"}</Button></form></CardContent></Card>:<Card className="mt-8 max-w-2xl"><CardContent className="p-8 text-center"><p className="font-semibold">Login to request a resource</p><p className="mt-1 text-sm text-muted-foreground">Your requests will be saved to your account so you can follow their status.</p><Button asChild className="mt-4"><a href="/login?next=/tools/resource-request">Login</a></Button></CardContent></Card>}{user&&<div className="mt-8 max-w-2xl"><h2 className="font-semibold">Your recent requests</h2><div className="mt-3 space-y-2"><StudentResourceRequestDetails requests={(requests ?? []).map((r:any)=>({ id:r.id,title:r.title,status:r.status,details:r.details ?? null,admin_note:r.admin_note ?? null,created_at:r.created_at,course_code:r.courses?.course_code ?? null }))} historyMap={historyMap} /></div></div>}</main><Footer/></div>
}
