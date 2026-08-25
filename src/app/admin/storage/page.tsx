import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, Trash2, AlertTriangle } from "lucide-react";
import { deleteStorageObject } from "./actions";

function formatBytes(bytes: number) { if (!bytes) return "0 B"; const u=["B","KB","MB","GB","TB"]; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),u.length-1); return `${(bytes/1024**i).toFixed(i===0?0:2)} ${u[i]}`; }
export default async function AdminStoragePage() {
  const admin=createAdminClient();
  const { data: usage, error: usageError } = await admin.rpc("admin_storage_usage");
  const { data: orphans } = await admin.rpc("admin_storage_orphans", { p_limit: 100 });
  const rows=usage ?? [];
  const total=rows.reduce((s,r)=>s+Number(r.total_bytes||0),0);
  const objectCount=rows.reduce((s,r)=>s+Number(r.object_count||0),0);
  // Supabase storage quotas vary by plan, so do not invent a quota. Show actual usage by bucket.
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">Infrastructure</p><h2 className="text-2xl font-bold">Storage</h2><p className="mt-1 text-sm text-muted-foreground">Monitor every StudyHub storage bucket and clean up unlinked objects before they become waste.</p></div>
    {usageError ? <Card className="border-destructive/30"><CardContent className="p-5 text-sm text-destructive">Storage statistics are unavailable: {usageError.message}</CardContent></Card> : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Total stored" value={formatBytes(total)} /><Metric label="Objects" value={objectCount.toLocaleString()} /><Metric label="Buckets" value={String(rows.length)} /></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-primary" />Bucket usage</CardTitle></CardHeader><CardContent className="space-y-3">{rows.map(r=>{const bytes=Number(r.total_bytes||0);const pct=total?Math.round(bytes/total*100):0;return <div key={r.bucket_id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{r.bucket_id}</p><p className="text-xs text-muted-foreground">{Number(r.object_count).toLocaleString()} objects</p></div><p className="font-bold">{formatBytes(bytes)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${pct}%`}} /></div><p className="mt-1 text-[11px] text-muted-foreground">{pct}% of StudyHub stored bytes</p></div>})}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Cleanup candidates</CardTitle></CardHeader><CardContent className="space-y-3">{orphans?.length ? orphans.map(o=><div key={`${o.bucket_id}:${o.object_name}`} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium">{o.object_name}</p><p className="text-xs text-muted-foreground">{o.bucket_id} · {formatBytes(Number(o.object_size||0))}</p></div><form action={deleteStorageObject}><input type="hidden" name="bucket_id" value={o.bucket_id}/><input type="hidden" name="object_name" value={o.object_name}/><Button type="submit" size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button></form></div>) : <p className="text-sm text-muted-foreground">No obvious orphaned objects found.</p>}</CardContent></Card>
    </>}
  </div>;
}
function Metric({label,value}:{label:string;value:string}){return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></CardContent></Card>}
