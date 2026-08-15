import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBDT } from "@/lib/utils";
import type { FileVisibility } from "@/types/database.types";

const RESOURCE_STATUSES: NonNullable<FileVisibility>[] = [
  "draft",
  "published",
  "archived",
  "rejected",
];

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = String(searchParams.q ?? "").trim();
  const status = String(searchParams.status ?? "all");

  const admin = createAdminClient();

  let query = admin
    .from("files")
    .select(
      "id,title,category,pricing_type,price_cents,visibility,created_at,seller:profiles!files_seller_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (RESOURCE_STATUSES.includes(status as NonNullable<FileVisibility>)) {
    const visibility = status as NonNullable<FileVisibility>;
    query = query.eq("visibility", visibility);
  }

  const { data: files } = await query;

  const rows = files ?? [];

  const counts = {
    draft: rows.filter((f) => f.visibility === "draft").length,
    published: rows.filter((f) => f.visibility === "published").length,
    rejected: rows.filter((f) => f.visibility === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Catalog</p>
        <h2 className="text-2xl font-bold">Resource management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the catalog and inspect any resource, regardless of visibility.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Mini label="Draft" value={String(counts.draft)} />
        <Mini label="Published" value={String(counts.published)} />
        <Mini label="Rejected" value={String(counts.rejected)} />
      </div>

      <form className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search resource title or description"
        />

        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
          <option value="rejected">Rejected</option>
        </select>

        <Button type="submit">Filter</Button>
      </form>

      <div className="space-y-3">
        {rows.map((file: any) => (
          <Card key={file.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{file.title}</p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {file.seller?.full_name || "Seller"} ·{" "}
                  {file.category.replaceAll("_", " ")}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {file.visibility}
                  </Badge>

                  <Badge variant="secondary">
                    {file.pricing_type === "free"
                      ? "Free"
                      : formatBDT(file.price_cents)}
                  </Badge>
                </div>
              </div>

              <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto">
                <Button size="sm" variant="secondary" asChild>
                  <a
                    href={`/api/files/${file.id}/admin-view`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                </Button>

                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`/api/files/${file.id}/admin-download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!rows.length && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No resources found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}