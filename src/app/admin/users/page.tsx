import { createAdminClient } from "@/lib/supabase/server";
import { RoleSelect } from "@/components/admin/role-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = String(searchParams.q ?? "").trim();
  const admin = createAdminClient();
  const { data: users } = q
    ? await admin.from("profiles").select("id, full_name, role, is_seller, phone_number, university_email, student_id_verification_status, created_at").or(`full_name.ilike.%${q}%,university_email.ilike.%${q}%,phone_number.ilike.%${q}%,student_id.ilike.%${q}%`).order("created_at", { ascending: false }).limit(100)
    : await admin.from("profiles").select("id, full_name, role, is_seller, phone_number, university_email, student_id_verification_status, created_at").order("created_at", { ascending: false }).limit(100);
  const rows = users ?? [];
  const verified = rows.filter((u) => u.student_id_verification_status === "verified").length;
  const sellers = rows.filter((u) => u.is_seller).length;
  const admins = rows.filter((u) => ["admin", "super_admin"].includes(u.role)).length;

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">People</p><h2 className="text-2xl font-bold">Users & roles</h2><p className="mt-1 text-sm text-muted-foreground">Review accounts, EWU verification and admin permissions. Only super admins can grant admin roles.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Showing" value={String(rows.length)} /><Mini label="Verified" value={String(verified)} /><Mini label="Sellers" value={String(sellers)} /><Mini label="Admins" value={String(admins)} /></div>
    <form className="flex gap-2"><Input name="q" defaultValue={q} placeholder="Search name, EWU email, phone or student ID" /><Button type="submit">Search</Button></form>
    <Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">User</th><th className="p-3">Contact</th><th className="p-3">EWU</th><th className="p-3">Role</th><th className="p-3">Joined</th></tr></thead><tbody>{rows.map((u) => <tr key={u.id} className="border-t align-top"><td className="p-3"><p className="font-semibold">{u.full_name || "Unnamed user"}</p><p className="mt-1 text-xs text-muted-foreground">{u.id}</p></td><td className="p-3"><p>{u.university_email || "—"}</p><p className="mt-1 text-xs text-muted-foreground">{u.phone_number || "No phone"}</p></td><td className="p-3"><Badge variant={u.student_id_verification_status === "verified" ? "default" : "outline"}>{u.student_id_verification_status}</Badge></td><td className="p-3"><RoleSelect userId={u.id} currentRole={u.role} /></td><td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-sm text-muted-foreground">No users found.</p>}</CardContent></Card>
  </div>;
}
function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
