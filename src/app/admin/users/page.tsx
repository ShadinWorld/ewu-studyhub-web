import { createClient } from "@/lib/supabase/server";
import { RoleSelect } from "@/components/admin/role-select";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase.from("profiles").select("id, full_name, role, is_seller, created_at").order("created_at", { ascending: false }).limit(100);
  return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Joined</th></tr></thead><tbody>{(users ?? []).map((u) => <tr key={u.id} className="border-t"><td className="p-3">{u.full_name}</td><td className="p-3"><RoleSelect userId={u.id} currentRole={u.role} /></td><td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>;
}
