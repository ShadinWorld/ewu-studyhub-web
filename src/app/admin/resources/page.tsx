import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/lib/utils";
import { ResourceAdminAction } from "@/components/admin/resource-admin-action";
import { MessageSquare, ShieldAlert, Sparkles } from "lucide-react";
import { AIReindexButton } from "@/components/admin/ai-reindex-button";
import { AIResourceReviewButton } from "@/components/admin/ai-resource-review-button";
import type { FileVisibility } from "@/types/database.types";

function similarity(a: string, b: string) {
  const A = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
  const B = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));
  if (!A.size || !B.size) return 0;
  let intersection = 0; for (const token of A) if (B.has(token)) intersection += 1;
  return intersection / Math.max(A.size, B.size);
}

export default async function AdminResourcesPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const q = String(searchParams.q ?? "").trim();
  const status = String(searchParams.status ?? "all");
  const admin = createAdminClient();
  let query = admin.from("files").select("id,title,description,category,pricing_type,price_cents,visibility,created_at,file_size_bytes,seller_id,course_id").order("created_at", { ascending: false }).limit(100);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (["draft", "published", "archived", "rejected"].includes(status)) query = query.eq("visibility", status as FileVisibility);
  const { data: files } = await query;
  const rows = files ?? [];
  const sellerIds = Array.from(new Set(rows.map((file) => file.seller_id).filter(Boolean)));
  const fileIds = rows.map((file) => file.id);
  const courseIdsForLookup = Array.from(new Set(rows.map((file) => file.course_id).filter(Boolean))) as string[];
  const [{ data: sellers }, { data: analyses }, { data: courses }, { data: reports }, { data: sellerActivity }] = await Promise.all([
    sellerIds.length ? admin.from("profiles").select("id, full_name, avatar_url, phone_number, role, is_seller").in("id", sellerIds) : Promise.resolve({ data: [] as any[] }),
    fileIds.length ? admin.from("ai_resource_analyses").select("file_id,ai_course_code,ai_category,ai_topics,ai_tags,ai_confidence,moderation_flags,moderation_risk_score,seller_edited_at,status,ai_group_type,ai_group_conflicts,moderation_summary,moderation_evidence,moderation_reviewed_at").in("file_id", fileIds) : Promise.resolve({ data: [] as any[] }),
    courseIdsForLookup.length ? admin.from("courses").select("id,course_code,course_name").in("id", courseIdsForLookup) : Promise.resolve({ data: [] as any[] }),
    fileIds.length ? admin.from("reports").select("file_id,reason,status").in("file_id", fileIds).neq("status", "dismissed") : Promise.resolve({ data: [] as any[] }),
    sellerIds.length ? admin.from("files").select("seller_id,created_at").in("seller_id", sellerIds).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).not("visibility", "in", "(archived,rejected)").limit(1000) : Promise.resolve({ data: [] as any[] }),
  ]);
  const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller]));
  const analysisByFile = new Map((analyses ?? []).map((analysis) => [analysis.file_id, analysis]));
  const courseById = new Map((courses ?? []).map((course) => [course.id, course]));
  const reportCountByFile = new Map<string, number>(); for (const report of reports ?? []) reportCountByFile.set(report.file_id, (reportCountByFile.get(report.file_id) || 0) + 1);
  const seller30DayUploads = new Map<string, number>(); for (const activity of sellerActivity ?? []) seller30DayUploads.set(activity.seller_id, (seller30DayUploads.get(activity.seller_id) || 0) + 1);
  const counts = { draft: rows.filter((f) => f.visibility === "draft").length, published: rows.filter((f) => f.visibility === "published").length, archived: rows.filter((f) => f.visibility === "archived").length, rejected: rows.filter((f) => f.visibility === "rejected").length };
  const aiFlagCount = rows.filter((file) => (analysisByFile.get(file.id)?.moderation_flags?.length ?? 0) > 0).length;

  return <div className="space-y-6"><div><p className="text-sm font-semibold text-primary">Catalog</p><h2 className="text-2xl font-bold">Resource management</h2><p className="mt-1 text-sm text-muted-foreground">Search, inspect, remove and review AI-assisted moderation and anomaly signals. AI does not make the final approval decision.</p></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Mini label="Pending review" value={String(counts.draft)} /><Mini label="Published" value={String(counts.published)} /><Mini label="Removed" value={String(counts.archived)} /><Mini label="Rejected" value={String(counts.rejected)} /><Mini label="AI flags" value={String(aiFlagCount)} /></div>
    <div className="flex flex-col items-end gap-3 sm:flex-row sm:justify-between"><AIReindexButton /><Button asChild><a href="/admin/resources/upload">Upload multiple</a></Button></div><form className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><Input name="q" defaultValue={q} placeholder="Search resource title or description" /><select name="status" defaultValue={status} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option><option value="rejected">Rejected</option></select><Button type="submit">Filter</Button></form>
    <div className="space-y-3">{rows.map((file) => { const analysis = analysisByFile.get(file.id); const course = file.course_id ? courseById.get(file.course_id) : null; const flags = Array.isArray(analysis?.moderation_flags) ? analysis.moderation_flags as string[] : []; const courseMismatch = Boolean(analysis?.ai_course_code && course?.course_code && analysis.ai_course_code.toLowerCase() !== course.course_code.toLowerCase()); const duplicateNeighbor = rows.find((other) => other.id !== file.id && similarity(file.title, other.title) >= 0.82); const reportCount = reportCountByFile.get(file.id) || 0; const uploadVolume = seller30DayUploads.get(file.seller_id) || 0; const anomalyScore = Math.min(100, Number(analysis?.moderation_risk_score || 0) + (courseMismatch ? 30 : 0) + (duplicateNeighbor ? 35 : 0) + (reportCount >= 2 ? 20 : reportCount === 1 ? 10 : 0) + (uploadVolume >= 15 ? 10 : uploadVolume >= 10 ? 5 : 0)); const seller = sellerNames.get(file.seller_id); return <Card key={file.id}><CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-semibold">{file.title}</p>{analysis && <Badge variant="outline"><Sparkles className="mr-1 h-3 w-3" />AI analyzed</Badge>}{anomalyScore >= 50 && <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" />Review signal</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{seller?.full_name || "Uploader"} · {seller?.role === "admin" || seller?.role === "super_admin" ? "Admin upload" : seller?.is_seller ? "Seller upload" : "Student upload"} · {file.category.replaceAll("_", " ")}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{file.visibility === "draft" ? "Pending review" : file.visibility === "archived" ? "Removed" : file.visibility}</Badge><Badge variant="secondary">{file.pricing_type === "free" ? "Free" : formatBDT(file.price_cents)}</Badge><Badge variant="outline">{formatBytes(file.file_size_bytes)}</Badge>{analysis?.ai_group_type && <Badge variant="outline">{analysis.ai_group_type === "single" ? "Single" : analysis.ai_group_type === "related_bundle" ? "Related bundle" : "Mixed bundle"}</Badge>}{analysis?.ai_confidence != null && <Badge variant="outline">AI confidence {Math.round(Number(analysis.ai_confidence) * 100)}%</Badge>}</div>{(flags.length > 0 || courseMismatch || anomalyScore >= 50) && <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs"><p className="font-semibold text-amber-700 dark:text-amber-300">AI moderation / anomaly notes</p><ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">{courseMismatch && <li>AI suggested {analysis.ai_course_code}, but the selected course is {course?.course_code}.</li>}{duplicateNeighbor && <li>Very similar title to “{duplicateNeighbor.title}”; compare files before approval.</li>}{reportCount > 0 && <li>{reportCount} non-dismissed report{reportCount === 1 ? "" : "s"} attached to this resource.</li>}{uploadVolume >= 10 && <li>Uploader has {uploadVolume} non-removed uploads in the last 30 days.</li>}{flags.slice(0, 4).map((flag) => <li key={flag}>{flag}</li>)}{Array.isArray(analysis?.ai_group_conflicts) && analysis.ai_group_conflicts.slice(0, 3).map((flag: unknown) => typeof flag === "string" ? <li key={`group-${flag}`}>{flag}</li> : null)}{analysis?.moderation_summary && <li>{analysis.moderation_summary}</li>}{anomalyScore >= 50 && <li>Risk score: {Math.round(anomalyScore)}/100. Review before approval.</li>}</ul></div>}</div><div className="flex w-full flex-wrap gap-2 lg:w-auto"><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" asChild><a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer">View</a></Button><Button size="sm" variant="outline" asChild><a href={`/admin/users/${file.seller_id}`}><MessageSquare className="mr-1 h-3.5 w-3.5" />View profile / Message</a></Button>{seller?.phone_number && <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${normalizeWhatsAppNumber(seller.phone_number)}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>}</div><Button size="sm" variant="outline" asChild><a href={`/api/files/${file.id}/admin-download`} target="_blank" rel="noreferrer">Download</a></Button><AIResourceReviewButton id={file.id} analysisReady={Boolean(analysis)} /> <ResourceAdminAction id={file.id} title={file.title} /></div></CardContent></Card>; })}{!rows.length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No resources found.</CardContent></Card>}</div>
  </div>;
}
function formatBytes(value: number | null) { if (!value) return "—"; if (value < 1024) return `${value} B`; if (value < 1024*1024) return `${(value/1024).toFixed(1)} KB`; if (value < 1024*1024*1024) return `${(value/1024/1024).toFixed(1)} MB`; return `${(value/1024/1024/1024).toFixed(2)} GB`; }
function Mini({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
function normalizeWhatsAppNumber(value: string) { const digits = value.replace(/\D/g, ""); return digits.startsWith("0") ? `88${digits}` : digits; }
