import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";

export function QualityIndicator({
  rating,
  reviews,
  downloads,
  pages,
  hasDescription,
  hasPreview,
}: {
  rating: number;
  reviews: number;
  downloads: number;
  pages: number | null;
  hasDescription: boolean;
  hasPreview: boolean;
}) {
  let score = 0;
  if (hasDescription) score += 20;
  if (hasPreview) score += 20;
  if (pages && pages > 0) score += 15;
  if (reviews >= 1) score += 15;
  if (rating >= 4) score += 15;
  if (downloads >= 5) score += 15;

  const label = score >= 80 ? "Strong quality signals" : score >= 55 ? "Good quality signals" : reviews === 0 ? "New resource" : "Growing resource";
  const tone = score >= 80 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : score >= 55 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Resource quality</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-4 w-4 text-amber-400" />{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on real resource information and student activity.</p>
        </div>
        <Badge className={`rounded-full border-0 ${tone}`}>{score}/100</Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
        {hasDescription && <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />Description added</p>}
        {hasPreview && <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />Preview available</p>}
        {pages && <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{pages} pages</p>}
        {reviews > 0 && <p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{rating.toFixed(1)}★ from {reviews} review{reviews === 1 ? "" : "s"}</p>}
      </div>
    </div>
  );
}
