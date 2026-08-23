import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, BarChart3, HardDrive, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { deleteStorageObject } from "./actions";
import { InfoButton } from "@/components/ux/info-button";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), u.length - 1);
  return `${bytes < 0 ? "-" : ""}${(Math.abs(bytes) / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}

function formatGrowth(bytes: number) {
  if (bytes === 0) return "No change";
  return `${bytes > 0 ? "+" : ""}${formatBytes(bytes)}`;
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p>{hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}</CardContent></Card>;
}

export default async function AdminStoragePage() {
  const admin = createAdminClient();
  await admin.rpc("admin_storage_record_snapshot");
  const [{ data: usage, error: usageError }, { data: orphans }, { data: history }, { data: previewTraffic }] = await Promise.all([
    admin.rpc("admin_storage_usage"),
    admin.rpc("admin_storage_orphans", { p_limit: 100 }),
    admin.rpc("admin_storage_history", { p_days: 30 }),
    admin.rpc("admin_preview_request_summary", { p_days: 7 }),
  ]);

  const rows = usage ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);
  const objectCount = rows.reduce((sum, row) => sum + Number(row.object_count || 0), 0);
  const originalBytes = rows.filter((row) => row.bucket_id === "files-private").reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);
  const previewBytes = rows.filter((row) => row.bucket_id === "files-preview").reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);
  const thumbnailBytes = rows.filter((row) => row.bucket_id === "thumbnails").reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);

  const quota = Number(process.env.STUDYHUB_STORAGE_QUOTA_BYTES ?? 0);
  const quotaPct = quota > 0 ? Math.min(100, (total / quota) * 100) : null;
  const status = quotaPct === null ? "observe" : quotaPct >= 90 ? "critical" : quotaPct >= 75 ? "watch" : "healthy";

  const dailyTotals = new Map<string, number>();
  for (const entry of history ?? []) dailyTotals.set(entry.snapshot_date, (dailyTotals.get(entry.snapshot_date) ?? 0) + Number(entry.total_bytes ?? 0));
  const orderedDays = Array.from(dailyTotals.keys()).sort();
  const latest = orderedDays.length ? dailyTotals.get(orderedDays[orderedDays.length - 1]) ?? total : total;
  const sevenDaysAgo = orderedDays.length > 1 ? dailyTotals.get(orderedDays[Math.max(0, orderedDays.length - 8)]) ?? latest : latest;
  const thirtyDaysAgo = orderedDays.length > 1 ? dailyTotals.get(orderedDays[0]) ?? latest : latest;
  const dailyGrowth30 = orderedDays.length > 1 ? (latest - thirtyDaysAgo) / Math.max(1, orderedDays.length - 1) : 0;
  const projected90 = Math.max(0, latest + dailyGrowth30 * 90);
  const reclaimableBytes = (orphans ?? []).reduce((sum, row) => sum + Number(row.object_size || 0), 0);
  const previewRequests7d = Number(previewTraffic?.[0]?.total_requests ?? 0);
  const activePreviewResources7d = Number(previewTraffic?.[0]?.active_resources ?? 0);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-primary">Infrastructure</p>
        <h2 className="text-2xl font-bold">Storage Health</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Track where StudyHub storage is going, how quickly it is growing, and whether preview traffic is becoming expensive or risky.</p>
      </div>
      <InfoButton title="Understanding storage health">
        <div className="space-y-3">
          <p><strong>Storage</strong> is the physical size of files kept in your buckets. Downloads do not create another stored copy of the same file.</p>
          <p><strong>Preview requests</strong> are StudyHub application requests. They are not the same as Supabase provider egress, so use the Supabase dashboard for billing/quota truth.</p>
          <p><strong>90-day projection</strong> is an estimate based on recent snapshot growth. It is a planning signal, not a billing forecast.</p>
        </div>
      </InfoButton>
    </div>

    {usageError ? <Card className="border-destructive/30"><CardContent className="p-5 text-sm text-destructive">Storage statistics are unavailable: {usageError.message}</CardContent></Card> : <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total stored" value={formatBytes(total)} />
        <Metric label="Objects" value={objectCount.toLocaleString()} />
        <Metric label="Preview requests · 7d" value={previewRequests7d.toLocaleString()} hint={`${activePreviewResources7d.toLocaleString()} active resources`} />
        <Metric label="Reclaimable" value={formatBytes(reclaimableBytes)} hint={`${orphans?.length ?? 0} orphan candidates`} />
      </div>

      <Card className={status === "critical" ? "border-destructive/40" : status === "watch" ? "border-amber-500/40" : ""}>
        <CardHeader><CardTitle className="flex items-center justify-between gap-3"><span>Capacity</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "critical" ? "bg-destructive/10 text-destructive" : status === "watch" ? "bg-amber-500/10 text-amber-700" : status === "observe" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>{status === "observe" ? "Quota not configured" : status}</span></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {quotaPct === null ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Set <code>STUDYHUB_STORAGE_QUOTA_BYTES</code> on the server to enable capacity percentage and upload guardrails. The app intentionally does not invent a Supabase plan quota.</div> : <>
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Used</p><p className="text-2xl font-bold">{formatBytes(total)}</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Configured quota</p><p className="font-semibold">{formatBytes(quota)}</p></div></div>
            <div className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${status === "critical" ? "bg-destructive" : status === "watch" ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${quotaPct.toFixed(1)}%` }} /></div>
            <p className="text-xs text-muted-foreground">{quotaPct.toFixed(1)}% used · {formatBytes(Math.max(0, quota - total))} remaining. Uploads are blocked at 95% of this configured capacity.</p>
          </>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Original files</p><p className="mt-1 text-xl font-bold">{formatBytes(originalBytes)}</p><p className="mt-2 text-xs text-muted-foreground">Private source assets. This is the main durable storage footprint.</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Preview artifacts</p><p className="mt-1 text-xl font-bold">{formatBytes(previewBytes)}</p><p className="mt-2 text-xs text-muted-foreground">Small guest-safe samples. New paid previews only store the visible portion.</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Thumbnails</p><p className="mt-1 text-xl font-bold">{formatBytes(thumbnailBytes)}</p><p className="mt-2 text-xs text-muted-foreground">Cover/thumbnail assets used across browsing surfaces.</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Growth signal</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="7-day change" value={formatGrowth(latest - sevenDaysAgo)} />
              <Metric label="30-day change" value={formatGrowth(latest - thirtyDaysAgo)} />
            </div>
            <div className="rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold">{dailyGrowth30 >= 0 ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-primary" />}Projected 90-day stored size</div><p className="mt-1 text-2xl font-bold">{formatBytes(projected90)}</p><p className="mt-1 text-xs text-muted-foreground">Based on the current snapshot trend. More historical snapshots make this estimate more useful.</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bucket usage</CardTitle></CardHeader>
          <CardContent className="space-y-3">{rows.map((row) => { const bytes = Number(row.total_bytes || 0); const pct = total ? Math.round(bytes / total * 100) : 0; return <div key={row.bucket_id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{row.bucket_id}</p><p className="text-xs text-muted-foreground">{Number(row.object_count).toLocaleString()} objects</p></div><p className="font-bold">{formatBytes(bytes)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{pct}% of StudyHub stored bytes</p></div>; })}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Safe cleanup candidates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Only objects older than 24 hours and unlinked from known StudyHub records are listed. Review before deleting.</p>
          {orphans?.length ? orphans.map((orphan) => <div key={`${orphan.bucket_id}:${orphan.object_name}`} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium">{orphan.object_name}</p><p className="text-xs text-muted-foreground">{orphan.bucket_id} · {formatBytes(Number(orphan.object_size || 0))}</p></div><form action={deleteStorageObject}><input type="hidden" name="bucket_id" value={orphan.bucket_id}/><input type="hidden" name="object_name" value={orphan.object_name}/><Button type="submit" size="sm" variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button></form></div>) : <p className="text-sm text-muted-foreground">No safe orphan candidates found.</p>}
        </CardContent>
      </Card>
    </>}
  </div>;
}
