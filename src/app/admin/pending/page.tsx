import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const filters = ["all", "resources", "sellers", "payouts", "purchases", "resource_requests", "reports", "support"] as const;

export default async function AdminPendingPage({ searchParams }: { searchParams?: { type?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/pending");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "super_admin"].includes(profile.role)) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: responseSettings } = await admin.from("platform_response_time_settings").select("category,estimated_hours");
  const responseHours = new Map<string, number>((responseSettings ?? []).map(row => [row.category, Number(row.estimated_hours)]));
  const defaultEta = Number(responseHours.get("default") ?? 6) || 6;
  const requestedType = searchParams?.type ?? "all";
  const type = filters.includes(requestedType as any) ? requestedType : "all";
  const [{ data: resources }, { data: sellers }, { data: payouts }, { data: purchases }, { data: resourceRequests }, { data: reports }, { data: support }] = await Promise.all([
    (type === "all" || type === "resources") ? admin.from("files").select("id,title,created_at,seller_id,upload_batch_id").eq("visibility", "draft").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "sellers") ? admin.from("profiles").select("id,full_name,university_email,created_at").eq("student_id_verification_status", "pending").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "payouts") ? admin.from("payouts").select("id,amount_cents,status,created_at,seller_id").eq("status", "pending").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "purchases") ? admin.from("purchases").select("id,amount_cents,status,created_at,buyer_id,file_id,files(title)").eq("status", "pending").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "resource_requests") ? admin.from("resource_requests").select("id,title,status,created_at,user_id").eq("status", "open").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "reports") ? admin.from("reports").select("id,reason,status,created_at,reporter_id,file_id,files(title)").eq("status", "open").order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
    (type === "all" || type === "support") ? admin.from("support_tickets").select("id,subject,category,status,created_at,user_id").in("status", ["new","in_review"]).order("created_at", { ascending: true }).limit(100) : Promise.resolve({ data: [] }),
  ]);
  const ids = Array.from(new Set([...(resources ?? []).map((x: any) => x.seller_id), ...(payouts ?? []).map((x: any) => x.seller_id), ...(purchases ?? []).map((x: any) => x.buyer_id)].filter(Boolean)));
  const { data: people } = ids.length ? await admin.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  const names = new Map((people ?? []).map((p: any) => [p.id, p.full_name]));
  const resourceGroups = new Map<string, any[]>();
  for (const r of resources ?? []) {
    const key = r.upload_batch_id ?? r.id;
    resourceGroups.set(key, [...(resourceGroups.get(key) ?? []), r]);
  }
  const groupedResourceRows = Array.from(resourceGroups.values()).map((group: any[]) => ({
    ...group[0],
    title: group.length > 1 ? `${group[0].title} · ${group.length} files` : group[0].title,
    id: group[0].id,
  }));

  const rows = [
    ...groupedResourceRows.map((r: any) => ({ key: `r-${r.upload_batch_id ?? r.id}`, type: "Resource approval", title: r.title, who: names.get(r.seller_id) ?? "Seller", created: r.created_at, href: "/admin/uploads" })),
    ...(sellers ?? []).map((r: any) => ({ key: `s-${r.id}`, type: "Seller verification", title: r.full_name ?? "Seller request", who: r.university_email ?? "EWU student", created: r.created_at, href: "/admin/sellers" })),
    ...(payouts ?? []).map((r: any) => ({ key: `p-${r.id}`, type: "Payout request", title: `BDT ${(r.amount_cents / 100).toFixed(2)}`, who: names.get(r.seller_id) ?? "Seller", created: r.created_at, href: "/admin/payouts" })),
    ...(purchases ?? []).map((r: any) => ({ key: `b-${r.id}`, type: "Purchase request", title: r.files?.title ?? "Resource purchase", who: names.get(r.buyer_id) ?? "Buyer", created: r.created_at, href: "/admin/payments" })),
    ...(resourceRequests ?? []).map((r: any) => ({ key: `rr-${r.id}`, type: "Resource request", title: r.title, who: names.get(r.user_id) ?? "Student", created: r.created_at, href: "/admin/academic-tools" })),
    ...(reports ?? []).map((r: any) => ({ key: `rep-${r.id}`, type: "Report", title: r.files?.title ?? String(r.reason).replaceAll("_", " "), who: names.get(r.reporter_id) ?? "User", created: r.created_at, href: "/admin/reports" })),
    ...(support ?? []).map((r: any) => ({ key: `sup-${r.id}`, type: "Support", title: r.subject || `${String(r.category).replaceAll("_", " ")} request`, who: names.get(r.user_id) ?? "User", created: r.created_at, href: "/admin/support" })),
  ].map((row) => {
    const category = row.type === "Resource approval" ? "resource_approval" : row.type === "Seller verification" ? "seller_verification" : row.type === "Payout request" ? "payout_request" : row.type === "Purchase request" ? "purchase_request" : row.type === "Resource request" ? "resource_request" : row.type === "Report" ? "report" : "support";
    const eta = Number(responseHours.get(category) ?? defaultEta) || defaultEta;
    const ageHours = Math.max(0, (Date.now() - new Date(row.created).getTime()) / 3600000);
    return { ...row, category, eta, ageHours, overdue: ageHours > eta };
  }).sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

  return <div className="flex min-h-screen flex-col"><Navbar /><main className="container max-w-5xl flex-1 py-6 sm:py-10"><div className="flex items-start gap-3"><Button asChild variant="outline" size="icon"><Link href="/admin" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button><div><p className="text-sm font-semibold text-primary">Admin work queue</p><h1 className="text-2xl font-bold sm:text-3xl">Pending Work</h1><p className="mt-1 text-sm text-muted-foreground">Everything currently waiting for an admin decision, ordered by oldest waiting item first.</p></div></div>
    <div className="mt-5 flex flex-wrap gap-2">{filters.map((f) => <Button key={f} asChild size="sm" variant={type === f ? "default" : "outline"}><Link href={f === "all" ? "/admin/pending" : `/admin/pending?type=${f}`}>{f[0].toUpperCase() + f.slice(1)}</Link></Button>)}</div>
    <Card className="mt-5"><CardHeader><CardTitle>{rows.length} pending item{rows.length === 1 ? "" : "s"}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.length ? rows.map((r) => <div key={r.key} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${r.overdue ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"}`}>{r.type}</span><span className="text-xs text-muted-foreground">Waiting since {new Date(r.created).toLocaleString()} · {r.overdue ? "Overdue" : `ETA ${r.eta}h`}</span></div><p className="mt-2 font-semibold">{r.title}</p><p className="mt-1 text-xs text-muted-foreground">Requester: {r.who}</p></div><Button asChild size="sm"><Link href={r.href}>Review</Link></Button></div>) : <p className="py-8 text-center text-sm text-muted-foreground">No pending work in this filter.</p>}</CardContent></Card>
  </main><Footer /></div>;
}
