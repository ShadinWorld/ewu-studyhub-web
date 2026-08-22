import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
type HistoryRole = "student" | "seller" | "admin" | "super_admin";
type HistoryFilter = HistoryRole | "all";

export default async function AdminHistoryPage({ searchParams }: { searchParams: { role?: string } }) {
  const admin = createAdminClient();
  const requestedRole = searchParams.role;
  const role: HistoryFilter = ["student", "seller", "admin", "super_admin"].includes(requestedRole ?? "")
    ? (requestedRole as HistoryRole)
    : "all";
  let query = admin.from("user_activity_history").select("id,actor_id,actor_role,action,entity_type,entity_id,description,created_at,metadata").order("created_at",{ascending:false}).limit(500);
  if(role !== "all") query = query.eq("actor_role", role);
  const { data: rows } = await query;
  const ids = Array.from(new Set((rows ?? []).map(r=>r.actor_id).filter(Boolean))) as string[];
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id,full_name,role,is_seller").in("id",ids) : { data: [] as any[] };
  const names = new Map((profiles ?? []).map(p=>[p.id,p.full_name || "User"]));
  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Audit</p><h2 className="text-2xl font-bold">History</h2><p className="mt-1 text-sm text-muted-foreground">Separate activity tracking for Student, Seller and Admin accounts.</p></div><div className="flex flex-wrap gap-2">{["all","student","seller","admin"].map(r=><Link key={r} href={r==="all"?"/admin/history":`/admin/history?role=${r}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${role===r?"border-primary bg-primary/10 text-primary":"hover:bg-accent"}`}>{r}</Link>)}</div><div className="space-y-3">{rows?.length ? rows.map((r:any)=><Card key={r.id}><CardContent className="p-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-semibold">{names.get(r.actor_id) || "System"} <span className="font-normal text-muted-foreground">· {String(r.action).replaceAll("."," ")}</span></p><p className="mt-1 text-sm text-muted-foreground">{r.description || "Activity recorded"}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{r.actor_role}</Badge><Badge variant="secondary">{r.entity_type || "account"}</Badge><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-BD")}</span></div></div></CardContent></Card>) : <Card><CardHeader><CardTitle>No history found</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">No activity matches this filter.</CardContent></Card>}</div></div>;
}
