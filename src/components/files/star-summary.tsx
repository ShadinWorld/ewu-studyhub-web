import { Star } from "lucide-react";

export function StarSummary({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        {rating.toFixed(1)}
      </span>
      <span className="text-sm text-muted-foreground">
        {count} {count === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}
