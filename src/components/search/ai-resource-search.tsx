"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles, Star, ArrowRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Result {
  id: string;
  title: string;
  description: string | null;
  category: string;
  pricing_type: string;
  price_cents: number;
  average_rating: number;
  reviews_count: number;
  downloads_count: number;
  course_code: string | null;
  course_name: string | null;
  seller_name: string | null;
  semantic_score: number;
  lexical_score: number;
  match_relevance: number;
  popularity_score: number;
  fallback: boolean;
}

interface CourseSuggestion {
  id: string;
  course_code: string;
  course_name: string;
  matching_resources: number;
}

interface SearchState {
  course_code: string | null;
  topic_terms: string[];
  resource_terms: string[];
  semester: string | null;
  year: number | null;
  price_filter: string | null;
  min_rating: number | null;
  sort: string | null;
}

export function AIResourceSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [courseSuggestions, setCourseSuggestions] = useState<CourseSuggestion[]>([]);
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [requestHref, setRequestHref] = useState<string | null>(null);
  const [fallbackCount, setFallbackCount] = useState(0);
  const [exactCount, setExactCount] = useState(0);

  useEffect(() => {
    if (initialQuery.trim()) setQuery(initialQuery);
  }, [initialQuery]);

  async function ask() {
    const text = query.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setQuery("");
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/ai/resource-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, searchState }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "AI search failed.");
      setResults(json.results || []);
      setCourseSuggestions(json.courseSuggestions || []);
      setSearchState(json.searchState || null);
      setRequestHref(json.requestHref || null);
      setFallbackCount(Number(json.fallbackCount || 0));
      setExactCount(Number(json.exactCount || 0));
      setMessages((current) => [...current, { role: "assistant", content: json.response || "I updated the search results." }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-3xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-6" aria-labelledby="ai-search-heading">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary"><Bot className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p id="ai-search-heading" className="font-semibold">Ask StudyHub AI</p><span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Beta</span></div>
          <p className="mt-1 text-sm text-muted-foreground">Search naturally and refine the same search with follow-ups like “konta beshi popular”, “free only”, “Spring 2026”, or “rating 4+”.</p>
        </div>
      </div>

      {searchState && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Current AI search filters">
          {searchState.course_code && <span className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium">Course: {searchState.course_code}</span>}
          {searchState.topic_terms.slice(0, 4).map((topic) => <span key={`topic-${topic}`} className="rounded-full border bg-background px-2.5 py-1 text-xs">Topic: {topic}</span>)}
          {searchState.price_filter && <span className="rounded-full border bg-background px-2.5 py-1 text-xs">Price: {searchState.price_filter}</span>}
          {searchState.semester && <span className="rounded-full border bg-background px-2.5 py-1 text-xs">Semester: {searchState.semester}{searchState.year ? ` ${searchState.year}` : ""}</span>}
          {searchState.sort && searchState.sort !== "relevance" && <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs"><SlidersHorizontal className="h-3 w-3" /> {searchState.sort.replaceAll("_", " ")}</span>}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {messages.slice(-6).map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "rounded-2xl bg-background p-3 text-sm" : "rounded-2xl bg-primary/10 p-3 text-sm"}>
            <span className="font-semibold">{message.role === "user" ? "You" : "StudyHub AI"}:</span> {message.content}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ask(); } }} placeholder="e.g. CSE303 PHP notes, free only…" className="h-11 bg-background" aria-label="Ask StudyHub AI" />
        <Button type="button" className="h-11 shrink-0" onClick={() => void ask()} disabled={!query.trim() || loading}><Sparkles className="h-4 w-4" />{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask AI"}</Button>
      </div>
      {notice && <p className="mt-2 text-xs text-destructive">{notice}</p>}

      {courseSuggestions.length > 0 && (
        <div className="mt-5 space-y-3">
          <div><p className="text-sm font-semibold">Courses with matching resources</p><p className="text-xs text-muted-foreground">AI found courses that contain the requested topic.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            {courseSuggestions.map((course) => (
              <a key={course.id} href={`/course/${course.id}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{course.course_code}</p><h3 className="mt-1 line-clamp-1 font-semibold">{course.course_name}</h3><p className="mt-1 text-xs text-muted-foreground">{course.matching_resources} matching resource{course.matching_resources === 1 ? "" : "s"}</p></div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      )}

      {(exactCount > 0 || fallbackCount > 0) && (
        <div className="mt-5 rounded-2xl border bg-background p-3 text-sm">
          {exactCount > 0 ? (
            <p><span className="font-semibold">Exact matches:</span> {exactCount}{searchState?.sort && searchState.sort !== "relevance" ? ` · sorted by ${searchState.sort.replaceAll("_", " ")}` : ""}</p>
          ) : (
            <p><span className="font-semibold">No exact match.</span> {fallbackCount} closest {fallbackCount === 1 ? "result" : "results"} are shown below.</p>
          )}
          {exactCount > 0 && <p className="mt-1 text-xs text-muted-foreground">Results are ranked using your course/topic filters, semantic similarity, metadata match, and the selected sort.</p>}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {results.map((result) => (
            <a key={result.id} href={`/files/${result.id}`} className="rounded-2xl border bg-background p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{result.course_code || "Academic resource"}</p>
              <h3 className="mt-1 line-clamp-2 font-semibold">{result.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{result.description || "Matched using your current course/topic filters and StudyHub search signals."}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {result.pricing_type === "free" ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span> : <span className="font-semibold text-foreground">৳{Math.round(result.price_cents / 100)}</span>}
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />{Number(result.average_rating || 0).toFixed(1)}</span>
                <span>{result.downloads_count} downloads</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{result.fallback ? "Closest match" : searchState?.sort === "popular" ? "Popular match" : result.semantic_score >= 0.65 ? "Strong topic match" : "Relevant match"}{result.course_code ? ` · ${result.course_code}` : ""}</p>
            </a>
          ))}
        </div>
      )}

      {requestHref && results.length === 0 && courseSuggestions.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed bg-background p-4">
          <p className="font-semibold">No exact match found.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another course/topic, or request the resource and the StudyHub team can track it.</p>
          <Button asChild variant="outline" className="mt-3"><a href={requestHref}>Request a resource</a></Button>
        </div>
      )}
    </section>
  );
}
