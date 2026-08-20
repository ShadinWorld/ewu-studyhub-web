import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResourceCardGrid, type ResourceCardData } from "@/components/files/resource-card";
import { Button } from "@/components/ui/button";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Saved Resources | EWU StudyHub",
  description: "Your saved EWU StudyHub resources.",
};

export default async function SavedResourcesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/saved");

  const { data: savedRows } = await supabase
    .from("wishlists")
    .select("file_id, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const fileIds = (savedRows ?? []).map((row) => row.file_id);
  let resources: ResourceCardData[] = [];

  if (fileIds.length > 0) {
    const { data: files } = await supabase
      .from("files")
      .select("id, title, thumbnail_url, file_kind, pricing_type, price_cents, average_rating, reviews_count, downloads_count, category, course_id, seller_id")
      .in("id", fileIds)
      .eq("visibility", "published");

    const courseIds = Array.from(new Set((files ?? []).map((file) => file.course_id).filter((id): id is string => Boolean(id))));
    const sellerIds = Array.from(new Set((files ?? []).map((file) => file.seller_id)));
    const [{ data: courses }, { data: sellers }] = await Promise.all([
      courseIds.length ? supabase.from("courses").select("id, course_code").in("id", courseIds) : Promise.resolve({ data: [] as { id: string; course_code: string }[] }),
      sellerIds.length ? createAdminClient().from("profiles").select("id, full_name").in("id", sellerIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);

    const courseCodes = new Map((courses ?? []).map((course) => [course.id, course.course_code]));
    const sellerNames = new Map((sellers ?? []).map((seller) => [seller.id, seller.full_name]));
    const byId = new Map((files ?? []).map((file) => [file.id, file]));
    resources = fileIds
      .map((id) => byId.get(id))
      .filter((file): file is NonNullable<typeof file> => Boolean(file))
      .map((file) => ({
        ...file,
        course_code: file.course_id ? courseCodes.get(file.course_id) : null,
        seller_name: sellerNames.get(file.seller_id) ?? null,
      }));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 py-10 pb-24 md:pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Bookmark className="h-5 w-5" />
              <span className="text-sm font-semibold">Your library</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Saved resources</h1>
            <p className="mt-2 text-muted-foreground">Keep useful notes and question banks one click away.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/search">Find more resources <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-8">
          <ResourceCardGrid files={resources} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
