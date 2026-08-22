import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/lib/utils";
import { ResourceAdminAction } from "@/components/admin/resource-admin-action";
import { MessageSquare } from "lucide-react";
import type { FileVisibility } from "@/types/database.types";

export default async function AdminResourcesPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const q = String(searchParams.q ?? "").trim();
  const status = String(searchParams.status ?? "all");
  const admin = createAdminClient();
  let query = admin.from("files").select("id,title,category,pricing_type,price_cents,visibility,created_at,file_size_bytes,seller_id").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (["draft", "published", "archived", "rejected"].includes(status)) query = query.eq("visibility", status as FileVisibility);
  const { data: files } = await query;
  const rows = files ?? [];
  const sellerIds = Array.from(new Set(rows.map((file) => file.seller_id).filter(Boolean)));
  const { data: sellers } = sellerIds.length
    ? await admin.from("profiles").select("id, full_name, avatar_url, phone_number, role, is_seller").in("id", sellerIds)
    : { data: [] as { id: string; full_name: string | null; avatar_url: string | null; phone_number: string | null; role: string; is_seller: boolean }[] };
  const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller]));
  const counts = { draft: rows.filter((f) => f.visibility === "draft").length, published: rows.filter((f) => f.visibility === "published").length, archived: rows.filter((f) => f.visibility === "archived").length, rejected: rows.filter((f) => f.visibility === "rejected").length };

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Catalog</p><h2 className="text-2xl font-bold">Resource management</h2><p className="mt-1 text-sm text-muted-foreground">Search, inspect, remove and monitor resource storage usage.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Pending review" value={String(counts.draft)} /><Mini label="Published" value={String(counts.published)} /><Mini label="Removed" value={String(counts.archived)} /><Mini label="Rejected" value={String(counts.rejected)} /></div>
    <div className="flex justify-end"><Button asChild><a href="/admin/resources/upload">Upload multiple</a></Button></div><form className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><Input name="q" defaultValue={q} placeholder="Search resource title or description" /><select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option><option value="rejected">Rejected</option></select><Button type="submit">Filter</Button></form>
    <div className="space-y-3">{rows.map((file) => <Card key={file.id}><CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{file.title}</p><p className="mt-1 text-xs text-muted-foreground">{sellerNames.get(file.seller_id)?.full_name || "Uploader"} · {sellerNames.get(file.seller_id)?.role === "admin" || sellerNames.get(file.seller_id)?.role === "super_admin" ? "Admin upload" : sellerNames.get(file.seller_id)?.is_seller ? "Seller upload" : "Student upload"} · {file.category.replaceAll("_", " ")}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{file.visibility === "draft" ? "Pending review" : file.visibility === "archived" ? "Removed" : file.visibility}</Badge><Badge variant="secondary">{file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}</Badge><Badge variant="outline">{formatBytes(file.file_size_bytes)}</Badge></div></div><div className="flex w-full flex-wrap gap-2 lg:w-auto"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" asChild><a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer">View</a></Button><Button size="sm" variant="outline" asChild><a href={`/admin/users/${file.seller_id}`}><MessageSquare className="mr-1 h-3.5 w-3.5" />View profile / Message</a></Button>{sellerNames.get(file.seller_id)?.phone_number && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${normalizeWhatsAppNumber(sellerNames.get(file.seller_id)?.phone_number || "")}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>}</div><Button size="sm" variant="outline" asChild><a href={`/api/files/${file.id}/admin-download`} target="_blank" rel="noreferrer">Download</a></Button><ResourceAdminAction id={file.id} title={file.title} /></div></CardContent></Card>)}{!rows.length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No resources found.</CardContent></Card>}</div>
  </div>;
}
function formatBytes(value: number | null) { if (!value) return "—"; if (value < 1024) return `${value} B`; if (value < 1024*1024) return `${(value/1024).toFixed(1)} KB`; if (value < 1024*1024*1024) return `${(value/1024/1024).toFixed(1)} MB`; return `${(value/1024/1024/1024).toFixed(2)} GB`; }
function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }

function normalizeWhatsAppNumber(value: string) { const digits = value.replace(/\D/g, ""); return digits.startsWith("0") ? `88${digits}` : digits; }
