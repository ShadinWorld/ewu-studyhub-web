import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateSupportTicket } from "./actions";
import type { SupportTicketStatus } from "@/types/database.types";

const categoryLabels: Record<string, string> = { suggestion: "Suggestion", complaint: "Complaint", general: "General", payment: "Payment", purchase: "Purchase", resource: "Resource", seller: "Seller / payout", account: "Account" };

export default async function AdminSupportPage() {
  const supabase = createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, category, subject, message, page_path, status, admin_reply, created_at, updated_at, user_id, profiles:user_id (full_name, role, university_email, phone_number)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (tickets ?? []) as unknown as Array<{ status: SupportTicketStatus } & Record<string, any>>;
  const counts = { new: rows.filter((t) => t.status === "new").length, in_review: rows.filter((t) => t.status === "in_review").length, resolved: rows.filter((t) => t.status === "resolved").length };

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold text-primary">Support desk</p><h2 className="text-2xl font-bold">Feedback & complaints</h2><p className="mt-1 text-sm text-muted-foreground">One place for suggestions, complaints, payment issues, resource reports and seller support.</p></div>
      <div className="grid grid-cols-3 gap-3"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">New</p><p className="text-2xl font-bold">{counts.new}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In review</p><p className="text-2xl font-bold">{counts.in_review}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{counts.resolved}</p></CardContent></Card></div>
      <div className="space-y-4">
        {rows.length ? rows.map((ticket: any) => (
          <Card key={ticket.id} className={ticket.status === "new" ? "border-primary/40" : ""}>
            <CardHeader className="pb-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge variant={ticket.category === "complaint" ? "destructive" : "secondary"}>{categoryLabels[ticket.category] ?? ticket.category}</Badge><Badge variant="outline" className="capitalize">{ticket.status.replaceAll("_", " ")}</Badge></div><CardTitle className="mt-2 text-base">{ticket.subject || "Support request"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{ticket.profiles?.full_name || "User"} · {ticket.profiles?.role || "student"} · {ticket.profiles?.university_email || ""} · {ticket.profiles?.phone_number || "No phone"}</p></div><time className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</time></div></CardHeader>
            <CardContent className="space-y-4"><p className="whitespace-pre-wrap text-sm leading-6">{ticket.message}</p>{ticket.page_path && <p className="text-xs text-muted-foreground">Sent from {ticket.page_path}</p>}
              <form action={updateSupportTicket} className="space-y-3 rounded-2xl border bg-muted/20 p-3"><input type="hidden" name="ticket_id" value={ticket.id} /><div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end"><div><label className="mb-1 block text-xs font-semibold">Status</label><select name="status" defaultValue={ticket.status} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="new">New</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select></div><div><label className="mb-1 block text-xs font-semibold">Admin reply</label><input name="admin_reply" defaultValue={ticket.admin_reply ?? ""} placeholder="Write a reply..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /></div><Button type="submit">Save</Button></div></form>
            </CardContent>
          </Card>
        )) : <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No support requests yet.</CardContent></Card>}
      </div>
    </div>
  );
}
