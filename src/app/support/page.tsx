import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { SupportFormCard } from "@/components/support/support-form";

export default async function SupportPage({ searchParams }: { searchParams?: { category?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/support");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, category, subject, message, status, admin_reply, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-8 sm:py-10">
        <section className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><MessageCircle className="h-6 w-6" /></div>
            <div><p className="text-sm font-semibold text-primary">EWU StudyHub Support</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Need help? We’re here.</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Send a suggestion, complaint, payment issue, purchase problem or seller question. You can also use the floating WhatsApp button for a faster chat.</p></div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <a href="https://wa.me/8801636050980" target="_blank" rel="noopener noreferrer" className="rounded-xl border bg-card p-3 text-sm font-semibold hover:bg-accent">💬 Chat on WhatsApp</a>
            <Link href="/purchases" className="rounded-xl border bg-card p-3 text-sm font-semibold hover:bg-accent">🛍️ Check purchases</Link>
            <Link href="/dashboard" className="rounded-xl border bg-card p-3 text-sm font-semibold hover:bg-accent">👤 Open dashboard</Link>
          </div>
        </section>

        <section className="mt-8"><h2 className="mb-3 text-lg font-bold">Send a message</h2><SupportFormCard pagePath="/support" defaultCategory={searchParams?.category ?? "general"} /></section>

        <section className="mt-8"><h2 className="mb-3 text-lg font-bold">Your support requests</h2><div className="space-y-3">{tickets?.length ? tickets.map((ticket) => <Card key={ticket.id}><CardContent className="p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">{ticket.subject || ticket.category.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-muted-foreground">{ticket.message}</p></div><span className="rounded-full border px-2.5 py-1 text-xs font-semibold capitalize">{ticket.status.replaceAll("_", " ")}</span></div>{ticket.admin_reply && <div className="mt-3 rounded-xl bg-accent/60 p-3 text-sm"><p className="font-semibold">Admin reply</p><p className="mt-1 text-muted-foreground">{ticket.admin_reply}</p></div>}</CardContent></Card>) : <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No support requests yet.</CardContent></Card>}</div></section>
      </main>
      <Footer />
    </div>
  );
}
