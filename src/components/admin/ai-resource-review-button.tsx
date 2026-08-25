"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIResourceReviewButton({ id, analysisReady = true }: { id: string; analysisReady?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  async function review() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      if (!analysisReady) {
        await fetch("/api/ai/system-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileIds: [id] }),
        });
      }
      const response = await fetch("/api/ai/admin-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI review failed.");
      setMessage(`${String(json.decision_hint || "review").toUpperCase()} · ${Math.round(Number(json.risk_score || 0))}/100 · ${String(json.summary || "Review complete.").slice(0, 110)}`);
      setDetails([...(Array.isArray(json.evidence) ? json.evidence : []), ...(Array.isArray(json.recommended_checks) ? json.recommended_checks : [])].filter((value): value is string => typeof value === "string").slice(0, 4));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI review failed.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void review()}>
        <Sparkles className="mr-1 h-3.5 w-3.5" />
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "AI Review"}
      </Button>
      {message && <div className="max-w-md text-[11px] text-muted-foreground">{message}{details.length > 0 && <ul className="mt-1 list-disc pl-4">{details.map((item) => <li key={item}>{item}</li>)}</ul>}</div>}
    </div>
  );
}
