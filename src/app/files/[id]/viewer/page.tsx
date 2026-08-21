import Link from "next/link";
import { ArrowLeft, ExternalLink, Lock, ShoppingBag } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";
import { PdfCanvasPreview } from "@/components/files/pdf-canvas-preview";

function previewCount(pageCount: number | null) {
  if (!pageCount || pageCount <= 0) return 0;
  return Math.min(pageCount, Math.max(1, Math.ceil(pageCount * 0.3)));
}

export default async function ResourceViewerPage({ params, searchParams }: { params: { id: string }; searchParams?: { preview?: string } }) {
  const supabase = createClient();
  const { data: file } = await supabase
    .from("files")
    .select("id, title, pricing_type, visibility, page_count, file_kind, price_cents, seller_id")
    .eq("id", params.id)
    .single();

  if (!file || file.visibility !== "published") notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = Boolean(user && file.seller_id === user.id);
  const previewOnly = searchParams?.preview === "1" && !isOwner;
  const isPaid = file.pricing_type === "paid";
  const isPdf = file.file_kind === "pdf";
  const isImage = file.file_kind === "image";
  const totalPages = Number(file.page_count ?? 0);
  const freePages = isPdf ? previewCount(totalPages) : 0;
  const lockedPages = isPaid && previewOnly && isPdf ? Math.max(0, totalPages - freePages) : 0;

  if (!previewOnly && isPaid && !isOwner) {
    if (!user) redirect(`/login?next=/files/${file.id}`);
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("file_id", file.id)
      .eq("buyer_id", user.id)
      .eq("status", "completed")
      .maybeSingle();
    if (!purchase) redirect(`/checkout/${file.id}`);
  }

  const fullSource = `/api/files/${file.id}/view`;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur sm:px-5">
        <Button asChild variant="ghost" size="sm"><Link href={`/files/${file.id}`}><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div className="min-w-0 text-center">
          <p className="max-w-[50vw] truncate text-sm font-semibold">{file.title}</p>
          {previewOnly && isPaid && isPdf && <p className="text-[11px] text-muted-foreground">Preview: {freePages} of {totalPages} pages open</p>}
        </div>
        {!previewOnly && <Button asChild variant="outline" size="sm"><a href={fullSource} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open</a></Button>}
        {previewOnly && <span className="w-10" />}
      </header>

      <main className="container flex-1 py-4 sm:py-6">
        <div className="mx-auto max-w-4xl space-y-5">
          {previewOnly && isPaid && isPdf ? (
            <>
              <section aria-label="Readable preview pages" className="space-y-5">
                {Array.from({ length: freePages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <article key={pageNumber} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                      <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">Page {pageNumber}</div>
                      <PdfCanvasPreview urls={[`/api/files/${file.id}/preview/page/${pageNumber}`]} />
                    </article>
                  );
                })}
              </section>

              {lockedPages > 0 && (
                <section aria-label="Locked preview pages" className="space-y-5">
                  {Array.from({ length: lockedPages }, (_, index) => {
                    const pageNumber = freePages + index + 1;
                    return (
                      <article key={pageNumber} className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-sm">
                        <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">Page {pageNumber}</div>
                        <div className="aspect-[8.27/11.69] w-full bg-white p-4 sm:p-7">
                          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 px-6 text-center sm:px-10">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border"><Lock className="h-8 w-8 text-muted-foreground" /></div>
                            <p className="mt-5 text-base font-semibold sm:text-lg">Page {pageNumber} is locked</p>
                            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Purchase this resource to unlock this page and all remaining pages.</p>
                            <Button asChild className="mt-5"><Link href={`/checkout/${file.id}`}><ShoppingBag className="mr-2 h-4 w-4" />Purchase for {formatBDT(file.price_cents)}</Link></Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          ) : previewOnly && isPaid && isImage ? (
            <section aria-label="Locked image preview" className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border bg-background shadow-sm">
              <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">Image preview · 30% visible / 70% locked</div>
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/20">
                <div className="absolute inset-x-0 top-0 h-[30%] overflow-hidden bg-white">
                  <PdfCanvasPreview urls={[`/api/files/${file.id}/preview/image`]} className="h-full" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[70%] bg-muted/20 p-4 sm:p-7">
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-background px-6 text-center sm:px-10">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted shadow-sm ring-1 ring-border"><Lock className="h-8 w-8 text-muted-foreground" /></div>
                    <p className="mt-5 text-base font-semibold sm:text-lg">70% of this image is locked</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Purchase this resource to view the complete image and access the original file.</p>
                    <Button asChild className="mt-5"><Link href={`/checkout/${file.id}`}><ShoppingBag className="mr-2 h-4 w-4" />Purchase for {formatBDT(file.price_cents)}</Link></Button>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <iframe title={`${file.title} viewer`} src={fullSource} className="h-[82vh] min-h-[700px] w-full bg-white" />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
