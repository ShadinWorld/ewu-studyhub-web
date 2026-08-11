"use client";

import { useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleWishlist } from "@/app/actions/wishlist";

export function SaveResourceButton({ fileId, saved }: { fileId: string; saved: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={saved ? "Remove from saved resources" : "Save resource"}
      title={saved ? "Remove from saved" : "Save resource"}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          const result = await toggleWishlist(fileId, saved);
          if (result.error) toast.error(result.error);
          else toast.success(result.saved ? "Saved to your resources" : "Removed from saved");
        });
      }}
      className="h-9 w-9 rounded-full bg-background/90 shadow-sm backdrop-blur"
    >
      {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
    </Button>
  );
}
