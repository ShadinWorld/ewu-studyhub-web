import { createClient } from "@/lib/supabase/server";
import { ADMIN_QUICK_ACTIONS } from "@/lib/admin-quick-actions";
import { AdminQuickActionGrid, type AdminQuickActionView } from "./admin-quick-actions-client";

export async function AdminQuickActions() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usage } = await supabase
    .from("admin_quick_action_usage")
    .select("action_key,use_count,last_used_at")
    .eq("profile_id", user.id);

  const usageMap = new Map((usage ?? []).map((row) => [row.action_key, row]));
  const actions: AdminQuickActionView[] = ADMIN_QUICK_ACTIONS
    .map((action) => ({
      ...action,
      useCount: Number(usageMap.get(action.key)?.use_count ?? 0),
      lastUsedAt: usageMap.get(action.key)?.last_used_at ?? null,
    }))
    .sort((a, b) => b.useCount - a.useCount || (b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0) - (a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0) || a.order - b.order);

  return (
    <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-background p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Admin control center</p>
          <h3 className="mt-1 text-xl font-bold sm:text-2xl">Quick Actions</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
            Every major Admin control is one click away. The most-used actions automatically move to the top for this Admin account.
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          {actions.length} controls
        </span>
      </div>
      <AdminQuickActionGrid actions={actions} />
    </section>
  );
}
