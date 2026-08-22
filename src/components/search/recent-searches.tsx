"use client";
import Link from "next/link";
import { Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "ewu-studyhub-recent-searches";
export function RecentSearches() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {} }, []);
  const save = (q: string) => { const next = [q, ...items.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 8); setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  useEffect(() => { const handler = () => { const input = document.querySelector<HTMLInputElement>('input[name="q"]'); if (input?.value.trim()) { const q = input.value.trim(); setItems((current) => { const next = [q, ...current.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 8); localStorage.setItem(KEY, JSON.stringify(next)); return next; }); } }; document.addEventListener("submit", handler); return () => document.removeEventListener("submit", handler); }, []);
  const remove = (q: string) => { const next = items.filter(x => x !== q); setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  if (!items.length) return null;
  return <div className="mt-2 rounded-xl border bg-card p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Recent searches</div><div className="flex flex-wrap gap-2">{items.map(q => <span key={q} className="inline-flex items-center gap-1 rounded-full border bg-background pl-3 pr-1 py-1 text-xs"><Link href={`/search?q=${encodeURIComponent(q)}`} onClick={() => save(q)} className="hover:text-primary">{q}</Link><button type="button" onClick={() => remove(q)} aria-label={`Remove ${q}`} className="rounded-full p-1 hover:bg-accent"><X className="h-3 w-3" /></button></span>)}</div></div>;
}
