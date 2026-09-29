import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminUserActivityPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const [{ data: user }, { data: rows }] = await Promise.all([
    admin.from("profiles").select("id, full_name, role, is_seller").eq("id", params.id).maybeSingle(),
    admin
      .from("user_activity_history")
      .select("id, actor_role, action, entity_type, entity_id, description, created_at, metadata")
      .eq("actor_id", params.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link>
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><History className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-primary">User activity</p>
              <h2 className="text-2xl font-bold">{user.full_name || "Unnamed user"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Admin-only activity history for this account.</p>
            </div>
          </div>
        </div>
        <Button asChild variant="outline"><Link href={`/admin/users/${user.id}`}>View profile</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows?.length ? rows.map((row) => (
            <div key={row.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{String(row.action).replaceAll(".", " ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.description || "Activity recorded"}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.actor_role}</Badge>
                  <Badge variant="secondary">{row.entity_type || "account"}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("en-BD")}</span>
                </div>
              </div>
            </div>
          )) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity history found for this user.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
