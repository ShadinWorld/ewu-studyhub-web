import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatBDT } from "@/lib/utils";

export default async function AdminResourcesPage() {
  const supabase=createClient();
  const {data:files}=await supabase.from("files").select("id,title,category,pricing_type,price_cents,visibility,created_at,seller:profiles!files_seller_id_fkey(full_name)").order("created_at",{ascending:false}).limit(100);
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">All Resources</h2><p className="mt-1 text-sm text-muted-foreground">Admin-only full access to published, draft and other resources.</p></div>{files?.length?<div className="space-y-3">{files.map((file:any)=><Card key={file.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-semibold">{file.title}</p><p className="mt-1 text-xs text-muted-foreground">{file.seller?.full_name||"Seller"} · {file.category.replaceAll("_"," ")}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{file.visibility}</Badge><Badge variant="secondary">{file.pricing_type==="free"?"Free":formatBDT(file.price_cents)}</Badge></div></div><div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto"><Button size="sm" variant="secondary" asChild><a href={`/api/files/${file.id}/admin-view`} target="_blank" rel="noreferrer">View</a></Button><Button size="sm" variant="outline" asChild><a href={`/api/files/${file.id}/admin-download`} target="_blank" rel="noreferrer">Download</a></Button></div></CardContent></Card>)}</div>:<div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">No resources found.</div>}</div>;
}
