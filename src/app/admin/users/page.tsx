import { createAdminClient } from "@/lib/supabase/server";
import { RoleSelect } from "@/components/admin/role-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; role?: string; seller?: string; status?: string; joined?: string } }) {
  const q = String(searchParams.q ?? "").trim();
  const role = String(searchParams.role ?? "all");
  const seller = String(searchParams.seller ?? "all");
  const status = String(searchParams.status ?? "all");
  const joined = String(searchParams.joined ?? "all");
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id, full_name, role, is_seller, phone_number, university_email, student_id_verification_status, account_status, created_at").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,university_email.ilike.%${q}%,phone_number.ilike.%${q}%,student_id.ilike.%${q}%`);
  if (["student","verified_student","seller","admin","super_admin"].includes(role)) query = query.eq("role", role as any);
  if (seller === "seller") query = query.eq("is_seller", true);
  if (seller === "non_seller") query = query.eq("is_seller", false);
  if (["active","restricted","suspended","banned"].includes(status)) query = query.eq("account_status", status as any);
  if (joined !== "all") {
    const now = Date.now();
    const days = joined === "today" ? 1 : joined === "7d" ? 7 : joined === "30d" ? 30 : null;
    if (days) query = query.gte("created_at", new Date(now - days*86400000).toISOString());
  }
  const { data: users } = await query;
  const rows = users ?? [];
  const verified = rows.filter((u) => u.student_id_verification_status === "verified").length;
  const sellers = rows.filter((u) => u.is_seller).length;
  const admins = rows.filter((u) => ["admin", "super_admin"].includes(u.role)).length;

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">People</p><h2 className="text-2xl font-bold">Users & roles</h2><p className="mt-1 text-sm text-muted-foreground">Filter by role, seller status, account status and join date. Newest users appear first.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Showing" value={String(rows.length)} /><Mini label="Verified" value={String(verified)} /><Mini label="Sellers" value={String(sellers)} /><Mini label="Admins" value={String(admins)} /></div>
    <form className="grid gap-2 md:grid-cols-2 xl:grid-cols-5"><Input name="q" defaultValue={q} placeholder="Search name, EWU email, phone or ID"/><select name="role" defaultValue={role} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All roles</option><option value="student">Student</option><option value="verified_student">Verified student</option><option value="seller">Seller</option><option value="admin">Admin</option><option value="super_admin">Super admin</option></select><select name="seller" defaultValue={seller} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All seller states</option><option value="seller">Sellers</option><option value="non_seller">Non-sellers</option></select><select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All account states</option><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select><select name="joined" defaultValue={joined} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">Any join date</option><option value="today">Joined today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option></select><Button type="submit" className="md:col-span-2 xl:col-span-5 xl:justify-self-end">Apply filters</Button></form>
    <div className="grid gap-3">{rows.map((u) => <Card key={u.id}><CardContent className="p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{u.full_name || "Unnamed user"}</p><Badge variant={u.account_status === "active" ? "default" : "destructive"}>{u.account_status}</Badge>{u.is_seller&&<Badge variant="secondary">Seller</Badge>}</div><p className="mt-1 break-all text-xs text-muted-foreground">{u.university_email || "No EWU email"}</p><p className="mt-1 text-xs text-muted-foreground">{u.phone_number || "No phone"} · Joined {new Date(u.created_at).toLocaleDateString()}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant={u.student_id_verification_status === "verified" ? "default" : "outline"}>{u.student_id_verification_status}</Badge><RoleSelect userId={u.id} currentRole={u.role}/></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto"><Button asChild size="sm" variant="outline"><Link href={`/admin/users/${u.id}`}>View</Link></Button>{u.phone_number&&<Button asChild size="sm" variant="outline"><a href={`https://wa.me/${u.phone_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>}<Button asChild size="sm" variant="outline"><Link href={`/admin/users/${u.id}`}>Message</Link></Button></div></div></CardContent></Card>)}{!rows.length&&<Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No users found.</CardContent></Card>}</div>
  </div>;
}
function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
