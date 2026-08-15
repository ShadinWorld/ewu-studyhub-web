import Link from "next/link";
import { ArrowLeft, ExternalLink, Lock } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function ResourceViewerPage({ params, searchParams }: { params: { id: string }; searchParams?: { preview?: string } }) {
  const supabase = createClient();
  const { data: file } = await supabase.from("files").select("id, title, pricing_type, visibility, preview_storage_path, page_count").eq("id", params.id).single();
  if (!file || file.visibility !== "published") notFound();

  const previewOnly = searchParams?.preview === "1";
  let source = `/api/files/${file.id}/view`;
  let previewMode = false;

  if (file.pricing_type === "paid" && previewOnly && file.preview_storage_path) {
    source = supabase.storage.from("files-preview").getPublicUrl(file.preview_storage_path).data.publicUrl;
    previewMode = true;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/files/${file.id}`);
    if (file.pricing_type === "paid") {
      const { data: purchase } = await supabase.from("purchases").select("id").eq("file_id", file.id).eq("buyer_id", user.id).eq("status", "completed").maybeSingle();
      if (!purchase) redirect(`/checkout/${file.id}`);
    }
  }

  return <div className="flex min-h-screen flex-col bg-background"><header className="flex min-h-14 items-center justify-between gap-2 border-b px-3 py-2 sm:px-5"><Button asChild variant="ghost" size="sm"><Link href={`/files/${file.id}`}><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button><div className="min-w-0 text-center"><p className="max-w-[45vw] truncate text-sm font-semibold">{file.title}</p>{previewMode && <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" />Free preview{file.page_count ? ` • ${Math.max(1, Math.min(file.page_count - 1, Math.ceil(file.page_count * 0.2)))} of ${file.page_count} pages` : ""}</p>}</div><Button asChild variant="outline" size="sm"><a href={source} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open</a></Button></header><main className="min-h-0 flex-1 p-2 sm:p-4"><iframe title={file.title} src={source} className="h-[calc(100vh-5.5rem)] w-full rounded-xl border bg-white" /></main></div>;
}
