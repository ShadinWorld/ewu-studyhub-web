import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default async function HistoryPage() {
  const supabase = createClient(); const { data:{user} } = await supabase.auth.getUser(); if(!user) redirect("/login?next=/history");
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("role,is_seller,full_name").eq("id",user.id).single(),
    (supabase as any).from("user_activity_history").select("id,actor_role,action,entity_type,entity_id,description,created_at,metadata").eq("actor_id",user.id).order("created_at",{ascending:false}).limit(300),
  ]);
  const roleLabel = profile?.role === "admin" || profile?.role === "super_admin" ? "Admin" : profile?.is_seller || profile?.role === "seller" ? "Seller" : "Student";
  return <main className="container max-w-4xl py-8"><div><p className="text-sm font-semibold text-primary">{roleLabel} history</p><h1 className="text-3xl font-bold">Your activity history</h1><p className="mt-1 text-sm text-muted-foreground">Every important StudyHub action is recorded here for your account.</p></div><div className="mt-6 space-y-3">{rows?.length ? rows.map((r:any)=><Card key={r.id}><CardContent className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{String(r.action).replaceAll("."," ")}</p><p className="mt-1 text-sm text-muted-foreground">{r.description || "Activity recorded"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{r.entity_type || "account"}</Badge><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-BD")}</span></div></div></CardContent></Card>) : <Card><CardHeader><CardTitle>No history yet</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Your important activity will appear here.</CardContent></Card>}</div></main>;
}
