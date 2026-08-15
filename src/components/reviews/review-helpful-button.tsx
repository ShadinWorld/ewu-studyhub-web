"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

export function ReviewHelpfulButton({ reviewId, initialVotes, initiallyVoted }: { reviewId: string; initialVotes: number; initiallyVoted: boolean }) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(initiallyVoted);
  const [pending, setPending] = useState(false);
  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/reviews/helpful", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update helpful vote.");
      setVotes(data.helpfulVotes);
      setVoted(data.voted);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update vote."); }
    finally { setPending(false); }
  }
  return <button type="button" onClick={toggle} disabled={pending} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${voted ? "border-primary/40 bg-primary/10 text-primary" : "hover:bg-muted"}`}><ThumbsUp className="h-3.5 w-3.5" />{voted ? "Helpful" : "Yes"} · {votes}</button>;
}
