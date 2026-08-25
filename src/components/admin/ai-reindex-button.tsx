"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIReindexButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function run() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai/reindex", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 30 }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Reindex failed.");
      setMessage(json.remaining ? `Indexed ${json.processed}. ${json.remaining} still need indexing.` : `Indexed ${json.processed}. AI search index is up to date.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reindex failed.");
    } finally {
      setLoading(false);
    }
  }
  return <div className="flex flex-col items-end gap-2"><Button type="button" variant="outline" onClick={() => void run()} disabled={loading}><Sparkles className="mr-1 h-4 w-4" />{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Index AI Search"}</Button>{message && <p className="max-w-xs text-right text-xs text-muted-foreground">{message}</p>}</div>;
}
