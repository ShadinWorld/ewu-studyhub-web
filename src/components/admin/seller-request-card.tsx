"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveSeller, rejectSeller } from "@/app/admin/sellers/actions";

export function SellerRequestCard({ request }: { request: any }) {
  const [isPending, startTransition] = useTransition(); const [handled, setHandled] = useState(false); const [aiPending, setAiPending] = useState(false); const [aiResult, setAiResult] = useState<any>(null);
  if (handled) return null;
  function act(fn: () => Promise<any>, msg: string) { startTransition(async () => { const res = await fn(); if (res?.error) toast.error(res.error); else { toast.success(msg); setHandled(true); } }); }
  async function runAiCheck() {
    setAiPending(true);
    try {
      const res = await fetch("/api/ai/seller-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId: request.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI verification failed.");
      setAiResult(json);
      toast.success(json.status === "match" ? "AI found a matching EWU email." : json.status === "mismatch" ? "AI found an email mismatch." : "AI could not confirm the email confidently.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "AI verification failed."); } finally { setAiPending(false); }
  }
  return <Card><CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="space-y-1"><p className="font-medium">{request.full_name}</p><p className="text-sm text-muted-foreground">EWU email: {request.university_email}</p><p className="text-xs text-muted-foreground">Student ID: {request.student_id}</p><p className="text-xs text-muted-foreground">bKash: {request.seller_bkash_number || "Not provided"}</p></div>
    <div className="flex flex-wrap gap-2">
      {request.idCardUrl ? <Button size="sm" variant="outline" asChild><a href={request.idCardUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> View ID card</a></Button> : <span className="rounded-md border px-3 py-2 text-xs text-destructive">ID card missing</span>}
      <Button size="sm" variant="secondary" disabled={aiPending || !request.idCardUrl || !request.university_email} onClick={() => void runAiCheck()}>{aiPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}AI email check</Button><span className="basis-full text-[11px] text-muted-foreground">AI check sends only the ID image to Gemini to extract the EWU email.</span>
      <Button size="sm" disabled={isPending} onClick={() => act(() => approveSeller(request.id), "Seller approved")}><Check className="mr-1 h-4 w-4" />Approve</Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act(() => rejectSeller(request.id), "Request rejected")}><X className="mr-1 h-4 w-4" />Reject</Button>
      {aiResult && <span className={`rounded-md border px-3 py-2 text-xs font-semibold ${aiResult.status === "match" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : aiResult.status === "mismatch" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{aiResult.status === "match" ? "✅ Email match" : aiResult.status === "mismatch" ? "❌ Email mismatch" : "⚠️ Manual review"}{aiResult.found_email ? ` · ${aiResult.found_email}` : ""}</span>}
    </div>
  </CardContent></Card>;
}
