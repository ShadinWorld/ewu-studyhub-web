"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, HelpCircle, Loader2, MessageCircle, Send, X, Sparkles, Bug, CreditCard, FileUp, LockKeyhole, ShoppingBag, Store, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const configuredNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "01636050980";
const whatsappNumber = configuredNumber.replace(/\D/g, "").replace(/^0/, "880");
const supportCategories = [
  ["account", "Login / Account", LockKeyhole], ["resource", "Resource", FileUp], ["payment", "Payment", CreditCard], ["purchase", "Purchase", ShoppingBag],
  ["seller", "Seller / Earnings", Store], ["upload", "Upload", FileUp], ["verification", "EWU Verification", CheckCircle2], ["technical", "Technical Problem", Bug], ["other", "Other", HelpCircle],
] as const;

type ChatMessage = { role: "user" | "assistant"; content: string };
type SearchState = Record<string, unknown> | null;

export function WhatsAppSupportButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"home" | "ai" | "help">("home");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi! I’m StudyHub AI. Tell me what resource, course, or topic you’re looking for." }]);
  const [input, setInput] = useState("");
  const [searchState, setSearchState] = useState<SearchState>(null);
  const [sending, setSending] = useState(false);
  const [selectedHelp, setSelectedHelp] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; phone_number: string | null; role: string | null } | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setEmail(user.email ?? null);
      const { data } = await supabase.from("profiles").select("full_name, phone_number, role").eq("id", user.id).maybeSingle();
      if (mounted) setProfile(data);
    })();
    return () => { mounted = false; };
  }, []);

  const selectedHelpItem = useMemo(() => supportCategories.find(([id]) => id === selectedHelp), [selectedHelp]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const response = await fetch("/api/ai/resource-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-10), searchState }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI search failed.");
      setSearchState(json.searchState ?? null);
      setMessages((current) => [...current, { role: "assistant", content: String(json.response || "I found some StudyHub results for you.") }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "AI is temporarily unavailable." }]);
    } finally {
      setSending(false);
    }
  }

  function buildSupportMessage() {
    const label = selectedHelpItem?.[1] ?? "General support";
    return [
      "Hello EWU StudyHub Admin 👋", "", `I need help regarding: ${label}`, "",
      `Name: ${profile?.full_name || "Not available"}`, `Email: ${email || "Not available"}`,
      `Phone: ${profile?.phone_number || "Not available"}`, `Role: ${profile?.role || "Not available"}`,
      `Current page: ${pathname || "/"}`, "", "Please help me with this issue.",
    ].join("\n");
  }

  function openWhatsApp() {
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildSupportMessage())}`, "_blank", "noopener,noreferrer");
    setOpen(false); setMode("home"); setSelectedHelp(null);
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setMode("home"); }} aria-label="Open StudyHub Assistant" className="fixed bottom-24 left-4 z-50 inline-flex items-center gap-2 rounded-full border bg-card/95 px-3 py-2.5 text-sm font-semibold text-foreground shadow-xl backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-2xl md:bottom-6 md:left-6">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
      <span className="hidden sm:inline">StudyHub Assistant</span>
      <span className="sm:hidden">Help</span>
    </button>

    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
      <div className={`w-full overflow-hidden rounded-3xl border bg-card shadow-2xl ${mode === "ai" ? "max-w-xl" : "max-w-md"}`}>
        <div className="flex items-start justify-between border-b p-5">
          <div><p className="text-sm font-semibold text-primary">EWU StudyHub</p><h2 id="assistant-title" className="mt-1 text-xl font-bold">{mode === "ai" ? "Ask StudyHub AI" : mode === "help" ? "Help & Support" : "StudyHub Assistant"}</h2><p className="mt-1 text-sm text-muted-foreground">{mode === "ai" ? "Ask naturally about resources, courses, topics, price, semester, ratings and more." : "Choose an AI search or support option."}</p></div>
          <button type="button" onClick={() => { setOpen(false); setMode("home"); }} aria-label="Close" className="rounded-full p-2 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        {mode === "home" && <div className="grid gap-3 p-5 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("ai")} className="rounded-2xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="h-5 w-5" /></div><p className="mt-3 font-semibold">Ask StudyHub AI</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Find resources by talking naturally and refine results with follow-up questions.</p></button>
          <button type="button" onClick={() => setMode("help")} className="rounded-2xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><HelpCircle className="h-5 w-5" /></div><p className="mt-3 font-semibold">Help & Support</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Open the existing support flow or contact StudyHub admin on WhatsApp.</p></button>
        </div>}

        {mode === "ai" && <><div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{message.content}</div></div>)}{sending && <div className="flex justify-start"><div className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}</div><div className="border-t p-4"><div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="e.g. CSE303 PHP-এর free note চাই" rows={2} className="min-h-11 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || sending}><Send className="h-4 w-4" /></Button></div><div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>Current filters stay active across follow-up questions.</span><button type="button" className="font-semibold text-primary" onClick={() => { setMessages([{ role: "assistant", content: "What would you like to find on StudyHub?" }]); setSearchState(null); }}>Reset chat</button></div></div></>}

        {mode === "help" && <div className="p-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{supportCategories.map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setSelectedHelp(id)} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold ${selectedHelp === id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"}`}><Icon className="h-5 w-5" />{label}</button>)}</div><div className="mt-4 border-t pt-4">{selectedHelpItem && <p className="mb-3 rounded-xl border bg-background p-3 text-xs leading-5 text-muted-foreground">We’ll include your name, email, phone, role and current page so the admin can understand the issue faster.</p>}<Button type="button" onClick={openWhatsApp} disabled={!selectedHelpItem} className="w-full" size="lg"><MessageCircle className="h-4 w-4" />Open WhatsApp</Button></div></div>}
      </div>
    </div>}
  </>;
}
