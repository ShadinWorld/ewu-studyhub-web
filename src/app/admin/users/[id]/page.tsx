import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, ShoppingBag, Upload, Wallet, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserStatus, sendAdminMessage } from "../actions";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: user } = await admin.from("profiles").select("id, full_name, avatar_url, role, is_seller, phone_number, university_email, university_email_verified, student_id, student_id_verification_status, account_status, wallet_balance_cents, created_at, updated_at, seller_bio").eq("id", params.id).maybeSingle();
  if (!user) notFound();
  const { data: sellerFiles } = await admin.from("files").select("id").eq("seller_id", user.id);
  const sellerFileIds = sellerFiles?.map(f => f.id) ?? [];
  const [{ count: purchases }, { count: resources }, { count: completedSales }, { data: messages }, { data: logs }] = await Promise.all([
    admin.from("purchases").select("id", { count: "exact", head: true }).eq("buyer_id", user.id).eq("status", "completed"),
    admin.from("files").select("id", { count: "exact", head: true }).eq("seller_id", user.id),
    sellerFileIds.length ? admin.from("purchases").select("id", { count: "exact", head: true }).eq("status", "completed").in("file_id", sellerFileIds) : Promise.resolve({ count: 0 }),
    admin.from("admin_messages").select("id, subject, body, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    admin.from("audit_logs").select("id, action, created_at, metadata").eq("target_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const whatsapp = user.phone_number ? `https://wa.me/${user.phone_number.replace(/\D/g, "")}` : null;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="outline"><Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to users</Link></Button><div className="flex gap-2">{whatsapp && <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />WhatsApp</a></Button>}</div></div>
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card><CardHeader><CardTitle>User profile</CardTitle></CardHeader><CardContent className="space-y-5"><div className="flex items-center gap-4">{user.avatar_url ? <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full border object-cover" /> : <div className="h-16 w-16 rounded-full bg-muted" />}<div><h2 className="text-xl font-bold">{user.full_name}</h2><p className="text-sm text-muted-foreground">{user.university_email || "No EWU email"}</p></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Purchases" value={String(purchases ?? 0)} icon={<ShoppingBag className="h-4 w-4" />} /><Metric label="Resources" value={String(resources ?? 0)} icon={<Upload className="h-4 w-4" />} /><Metric label="Sales" value={String(completedSales ?? 0)} icon={<Wallet className="h-4 w-4" />} /><Metric label="Wallet" value={`৳${((user.wallet_balance_cents ?? 0) / 100).toFixed(0)}`} icon={<Wallet className="h-4 w-4" />} /></div><div className="grid gap-3 sm:grid-cols-2 text-sm"><Info label="Phone / WhatsApp" value={user.phone_number || "—"} /><Info label="Student ID" value={user.student_id || "—"} /><Info label="Role" value={user.role} /><Info label="Seller" value={user.is_seller ? "Verified seller" : "Student"} /><Info label="EWU verification" value={user.student_id_verification_status} /><Info label="Account status" value={user.account_status} /><Info label="Joined" value={new Date(user.created_at).toLocaleString()} /><Info label="Last updated" value={new Date(user.updated_at).toLocaleString()} /></div></CardContent></Card>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Account status</CardTitle></CardHeader><CardContent><form action={updateUserStatus} className="space-y-3"><input type="hidden" name="user_id" value={user.id} /><select name="status" defaultValue={user.account_status} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="active">Active</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select><Button type="submit" className="w-full">Update status</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>Message user</CardTitle></CardHeader><CardContent><form action={sendAdminMessage} className="space-y-3"><input type="hidden" name="user_id" value={user.id} /><Input name="subject" placeholder="Subject" required /><textarea name="body" placeholder="Write your message…" rows={5} required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /><Button type="submit" className="w-full"><MessageSquare className="mr-2 h-4 w-4" />Send message</Button></form></CardContent></Card>
      </div>
    </div>
    <Card><CardHeader><CardTitle>Recent admin messages</CardTitle></CardHeader><CardContent className="space-y-3">{messages?.length ? messages.map(m => <div key={m.id} className="rounded-xl border p-3"><p className="font-semibold">{m.subject}</p><p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{m.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No messages yet.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Audit history</CardTitle></CardHeader><CardContent className="space-y-2">{logs?.length ? logs.map(l => <div key={l.id} className="rounded-xl border p-3"><p className="text-sm font-semibold">{l.action.replaceAll(".", " ")}</p><p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p></div>) : <p className="text-sm text-muted-foreground">No audit history for this user.</p>}</CardContent></Card>
  </div>;
}
function Metric({ label, value, icon }: { label:string; value:string; icon:React.ReactNode }) { return <div className="rounded-xl border bg-muted/20 p-3"><div className="flex items-center justify-between text-primary">{icon}</div><p className="mt-2 text-lg font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }
function Info({ label, value }: { label:string; value:string }) { return <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>; }
