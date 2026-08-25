import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { embedText, generateStructured, generateText, GEMINI_EMBED_MODEL, GEMINI_LIGHT_MODEL } from "@/lib/ai/gemini";

const intentSchema = {
  type: "object",
  properties: {
    intent: { type: "string", description: "One of: find_resources, find_courses, filter_results, sort_results, compare_results, clarify." },
    target: { type: "string", description: "One of: resources, courses, both." },
    course_code: { type: ["string", "null"] },
    department: { type: ["string", "null"] },
    topic_terms: { type: "array", items: { type: "string" } },
    resource_terms: { type: "array", items: { type: "string" } },
    semester: { type: ["string", "null"] },
    year: { type: ["integer", "null"] },
    price_filter: { type: ["string", "null"], description: "One of: free, paid, null." },
    max_price_cents: { type: ["integer", "null"] },
    min_rating: { type: ["number", "null"] },
    sort: { type: ["string", "null"], description: "One of: relevance, popular, most_downloaded, best_rated, newest, cheapest." },
    language: { type: "string", description: "bn, en, or mixed." },
    confidence: { type: "number" },
  },
  required: ["intent", "target", "course_code", "department", "topic_terms", "resource_terms", "semester", "year", "price_filter", "max_price_cents", "min_rating", "sort", "language", "confidence"],
};

type SearchIntent = {
  intent: string;
  target: "resources" | "courses" | "both";
  course_code: string | null;
  department: string | null;
  topic_terms: string[];
  resource_terms: string[];
  semester: string | null;
  year: number | null;
  price_filter: string | null;
  max_price_cents: number | null;
  min_rating: number | null;
  sort: string | null;
  language: string;
  confidence: number;
};

type SearchState = {
  course_code: string | null;
  department: string | null;
  topic_terms: string[];
  resource_terms: string[];
  semester: string | null;
  year: number | null;
  price_filter: string | null;
  max_price_cents: number | null;
  min_rating: number | null;
  sort: string;
  target: "resources" | "courses" | "both";
};

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  pricing_type: string;
  price_cents: number;
  average_rating: number;
  reviews_count: number;
  downloads_count: number;
  views_count: number;
  published_at: string | null;
  course_id: string | null;
  department_id: string | null;
  seller_id: string | null;
  ai_summary: string | null;
  ai_keywords: string[] | null;
}

interface CourseRow {
  id: string;
  course_code: string;
  course_name: string;
  department_id: string | null;
}

interface CourseSuggestion extends CourseRow {
  matching_resources: number;
}

const DEFAULT_STATE: SearchState = {
  course_code: null,
  department: null,
  topic_terms: [],
  resource_terms: [],
  semester: null,
  year: null,
  price_filter: null,
  max_price_cents: null,
  min_rating: null,
  sort: "relevance",
  target: "resources",
};

function normalizeCourseCode(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z]{2,6}\d{3,4}[A-Z]?$/.test(normalized) ? normalized : null;
}

function normalizeTerms(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length >= 2))).slice(0, 12);
}

function detectSort(text: string) {
  const q = text.toLowerCase();
  if (/\b(popular|populer|most popular|beshi popular|জনপ্রিয়|জনপ্রিয়)\b/.test(q)) return "popular";
  if (/\b(most downloaded|download beshi|beshi download|সবচেয়ে বেশি download|সবচেয়ে বেশি ডাউনলোড)\b/.test(q)) return "most_downloaded";
  if (/\b(best rated|highest rating|rating beshi|bhalo rating|সেরা rating|ভালো rating)\b/.test(q)) return "best_rated";
  if (/\b(newest|latest|notun|নতুন|recent|সাম্প্রতিক)\b/.test(q)) return "newest";
  if (/\b(cheap|cheapest|kom dam|kom price|সস্তা|কম দামের)\b/.test(q)) return "cheapest";
  return null;
}

function detectPrice(text: string) {
  const q = text.toLowerCase();
  if (/\bfree\b|বিনামূল্যে|ফ্রি/.test(q)) return { kind: "free", cents: null as number | null };
  const amount = q.match(/(?:under|below|less than|max|within|under price)\s*৳?\s*(\d{1,5})/i) || q.match(/৳\s*(\d{1,5})/);
  return amount ? { kind: "max", cents: Number(amount[1]) * 100 } : null;
}

function detectSemester(text: string) {
  const q = text.toLowerCase();
  if (/\bspring\b|বসন্ত/.test(q)) return "Spring";
  if (/\bsummer\b/.test(q)) return "Summer";
  if (/\bfall\b|autumn|শরৎ/.test(q)) return "Fall";
  return null;
}

function detectYear(text: string) {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function detectRating(text: string) {
  const q = text.toLowerCase();
  const match = q.match(/rating\s*(?:>=|at least|above|over|\+)\s*(\d(?:\.\d)?)/i) || q.match(/(\d(?:\.\d)?)\s*\+/);
  return match ? Math.min(5, Math.max(0, Number(match[1]))) : null;
}

function detectLanguage(text: string) {
  const hasBn = /[\u0980-\u09FF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasBn && hasLatin) return "mixed";
  if (hasBn) return "bn";
  return /\b(ki|ache|kon|konta|dekhaw|gula|gulo|chai|aache|korbe|popular|free|note|course|er|a|te|dao|dekhai|dekhaw|koyta)\b/i.test(text) ? "mixed" : "en";
}

function isFollowUpOnly(text: string) {
  return /\b(konta|kon ta|which|what|show|dekhaw|dekhai|free|popular|best|newest|latest|cheap|cheapest|rating|download|downloads|gula|gulo|only|শুধু|দেখাও|কোনটা|কতগুলো|কয়টা)\b/i.test(text.trim()) && !/[A-Za-z]{2,6}\s*[- ]?\d{3,4}/i.test(text);
}

function wantsCourseDiscovery(text: string) {
  const q = text.toLowerCase();
  return /\b(which|what|kon|কোন)\s+(course|courses|কোর্স)\b/.test(q) || /course\s*(a|e|তে|এ)\b/.test(q) || /কোন কোন course|কোন কোন কোর্স/.test(q);
}

function inferCourseFromConversation(messages: Array<{ role?: string; content?: string }>) {
  const userText = messages.filter((message) => message.role === "user").map((message) => message.content || "").join(" ");
  const matches = [...userText.matchAll(/\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b/g)];
  const last = matches.at(-1);
  return normalizeCourseCode(last ? `${last[1]}${last[2]}` : null);
}

function mergeSearchState(current: SearchState | null, intent: SearchIntent, lastMessage: string): SearchState {
  const base = current || DEFAULT_STATE;
  const followUpOnly = isFollowUpOnly(lastMessage);
  const detectedCourse = inferCourseFromConversation([{ role: "user", content: lastMessage }]) || normalizeCourseCode(intent.course_code);
  const sort = detectSort(lastMessage) || (followUpOnly ? base.sort : intent.sort) || "relevance";
  const detectedPrice = detectPrice(lastMessage);
  const detectedSemester = detectSemester(lastMessage);
  const detectedYear = detectYear(lastMessage);
  const detectedRating = detectRating(lastMessage);
  const target = wantsCourseDiscovery(lastMessage) ? "courses" : followUpOnly ? base.target : intent.target || base.target;
  const topicTerms = followUpOnly ? base.topic_terms : intent.topic_terms.length ? normalizeTerms(intent.topic_terms) : base.topic_terms;
  const resourceTerms = followUpOnly ? base.resource_terms : intent.resource_terms.length ? normalizeTerms(intent.resource_terms) : base.resource_terms;
  return {
    course_code: detectedCourse || (followUpOnly ? base.course_code : normalizeCourseCode(intent.course_code) || base.course_code),
    department: intent.department || base.department,
    topic_terms: topicTerms,
    resource_terms: resourceTerms,
    semester: detectedSemester || (isFollowUpOnly(lastMessage) ? base.semester : intent.semester || base.semester),
    year: detectedYear || (isFollowUpOnly(lastMessage) ? base.year : intent.year || base.year),
    price_filter: detectedPrice?.kind === "free" ? "free" : detectedPrice ? base.price_filter : isFollowUpOnly(lastMessage) ? base.price_filter : intent.price_filter || base.price_filter,
    max_price_cents: detectedPrice?.kind === "max" ? detectedPrice.cents : isFollowUpOnly(lastMessage) ? base.max_price_cents : intent.max_price_cents ?? base.max_price_cents,
    min_rating: detectedRating ?? (isFollowUpOnly(lastMessage) ? base.min_rating : intent.min_rating ?? base.min_rating),
    sort,
    target,
  };
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !/^(the|and|for|from|with|this|that|ki|ache|kon|konta|er|a|te|dao|dekhaw|gula|gulo)$/i.test(token))
    .slice(0, 18);
}

function scorePopularity(row: ResourceRow) {
  const rating = Number(row.average_rating || 0);
  const reviews = Number(row.reviews_count || 0);
  const downloads = Number(row.downloads_count || 0);
  const views = Number(row.views_count || 0);
  const ageDays = row.published_at ? Math.max(0, (Date.now() - new Date(row.published_at).getTime()) / 86400000) : 3650;
  const recency = Math.max(0, 20 - Math.min(20, ageDays / 15));
  return downloads * 5 + views * 0.15 + reviews * 4 + rating * 18 + recency;
}

function scoreLexical(row: ResourceRow, terms: string[]) {
  if (!terms.length) return 0;
  const haystack = [row.title, row.description, row.category, row.ai_summary, ...(row.ai_keywords || [])].filter(Boolean).join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term.toLowerCase()) ? 1 : 0), 0) / terms.length;
}

function buildPromptLanguage(language: string) {
  return language === "en" ? "Answer in clear English." : language === "bn" ? "Answer in natural Bangla." : "Answer in natural Banglish/Bangla using the user's style; keep course codes, resource titles, and numbers exactly as provided.";
}

async function composeReply({
  language,
  query,
  state,
  results,
  courseSuggestions,
  fallbackCount,
  requestAvailable,
}: {
  language: string;
  query: string;
  state: SearchState;
  results: Array<{ title: string; course_code: string | null; average_rating: number; downloads_count: number; pricing_type: string; price_cents: number; match_relevance: number }>;
  courseSuggestions: CourseSuggestion[];
  fallbackCount: number;
  requestAvailable: boolean;
}) {
  const prompt = `You are the final response writer for EWU StudyHub's academic marketplace search. ${buildPromptLanguage(language)}
Rules:
- Use ONLY the supplied search state and result data. Never invent a resource, course, price, rating, download count, or claim.
- Be concise and helpful: usually 1-4 sentences plus, when useful, a short ranked list of up to 3 named items.
- For follow-up filters/sorting, talk about the current search state, not a new unrelated search.
- If exact results are zero but fallbackCount > 0, clearly say the exact combination had no match and that these are closest alternatives.
- If courseSuggestions are present, answer as course discovery, grouped by course and resource count.
- When no result exists and requestAvailable is true, suggest requesting the resource.
- Do not expose internal scores, embeddings, IDs, or implementation details.

User query: ${query}
Search state: ${JSON.stringify(state)}
Results: ${JSON.stringify(results.slice(0, 6))}
Course suggestions: ${JSON.stringify(courseSuggestions.slice(0, 8))}
Fallback count: ${fallbackCount}
Request available: ${requestAvailable}`;
  try {
    const response = await generateText({ model: GEMINI_LIGHT_MODEL, prompt });
    return response || "I updated the search results.";
  } catch {
    if (courseSuggestions.length) return language === "en" ? `I found ${courseSuggestions.length} courses with matching resources.` : `আমি ${courseSuggestions.length}টা matching course পেয়েছি।`;
    if (results.length) return language === "en" ? `I found ${results.length} relevant resources.` : `আমি ${results.length}টা relevant resource পেয়েছি।`;
    return language === "en" ? "I couldn't find an exact match. Try another course/topic or request the resource." : "Exact match পাইনি। অন্য course/topic দিয়ে try করতে পারো, অথবা resource request করতে পারো।";
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json().catch(() => null) as { messages?: Array<{ role?: string; content?: string }>; searchState?: SearchState | null } | null;
  const messages = (body?.messages ?? []).filter((message) => message && (message.role === "user" || message.role === "assistant")).slice(-12);
  const lastMessage = messages.filter((message) => message.role === "user").at(-1)?.content?.trim() || "";
  if (!lastMessage) return NextResponse.json({ error: "Ask a resource question first." }, { status: 400 });
  if (lastMessage.length > 500) return NextResponse.json({ error: "Please keep the search under 500 characters." }, { status: 400 });

  const currentState = body?.searchState ? { ...DEFAULT_STATE, ...body.searchState } : null;
  let intent: SearchIntent = {
    intent: "find_resources", target: "resources", course_code: null, department: null, topic_terms: [], resource_terms: [],
    semester: null, year: null, price_filter: null, max_price_cents: null, min_rating: null, sort: null, language: detectLanguage(lastMessage), confidence: 0,
  };
  try {
    intent = await generateStructured<SearchIntent>({
      model: GEMINI_LIGHT_MODEL,
      schema: intentSchema,
      prompt: `You are EWU StudyHub's intent parser. Understand English, Bangla, and Banglish. Extract only what the latest user message changes; preserve the provided current search state when the message is a follow-up. Never invent course codes or resource facts.
Current search state: ${JSON.stringify(currentState || DEFAULT_STATE)}
Latest user message: ${lastMessage}

Examples:
- "CSE303 ki ki ache" => find_resources, course_code=CSE303
- "konta beshi popular" => sort_results, sort=popular, preserve current course/topic/filters
- "php ache kon course a" => find_courses, target=courses, topic_terms=["PHP"]
- "free only" => filter_results, price_filter=free
- "Spring 2026" => filter_results, semester=Spring, year=2026
- "rating 4+" => filter_results, min_rating=4
- "cheap notes" => sort_results, sort=cheapest
- "PHP ache kon course e" is course discovery, not resource listing.`
    });
  } catch {
    intent.resource_terms = tokenize(lastMessage);
    intent.language = detectLanguage(lastMessage);
  }

  const state = mergeSearchState(currentState, intent, lastMessage);
  const admin = createAdminClient();
  let course: CourseRow | null = null;
  if (state.course_code) {
    const { data } = await admin.from("courses").select("id,course_code,course_name,department_id").ilike("course_code", state.course_code).limit(1).maybeSingle();
    course = data;
  }

  const baseSelect = "id,title,description,category,pricing_type,price_cents,average_rating,reviews_count,downloads_count,views_count,published_at,course_id,department_id,seller_id,ai_summary,ai_keywords";
  const followUpOnly = isFollowUpOnly(lastMessage);
  const terms = normalizeTerms([...state.topic_terms, ...state.resource_terms, ...(followUpOnly ? [] : tokenize(lastMessage))]).slice(0, 18);
  const queryText = [lastMessage, ...state.topic_terms, ...state.resource_terms, state.course_code || "", state.semester || ""].filter(Boolean).join(" ").slice(0, 6000);

  let semanticScores = new Map<string, number>();
  try {
    const queryEmbedding = await embedText({ text: queryText || lastMessage, taskType: "RETRIEVAL_QUERY", model: GEMINI_EMBED_MODEL, outputDimensionality: 768 });
    const { data: matches } = await admin.rpc("search_ai_resource_embeddings", {
      p_query_embedding: queryEmbedding,
      p_limit: 100,
      p_course_id: null,
      p_department_id: null,
    });
    semanticScores = new Map((matches ?? []).map((row: { file_id: string; similarity: number }) => [row.file_id, Number(row.similarity)]));
  } catch {
    semanticScores = new Map();
  }

  if (state.target === "courses") {
    const semanticIds = Array.from(semanticScores.keys());
    const topicTerms = normalizeTerms([...state.topic_terms, ...state.resource_terms, ...(state.topic_terms.length || state.resource_terms.length ? [] : tokenize(lastMessage).filter((term) => !/^(course|courses|note|notes|resource|resources|kon|which|what|ache|a|e)$/i.test(term)))]);
    const clauses = topicTerms.flatMap((term) => [`ai_search_document.ilike.%${term.replace(/[,%()]/g, " ")}%`, `ai_content_index.ilike.%${term.replace(/[,%()]/g, " ")}%`]).join(",");
    const { data: lexicalAnalyses } = topicTerms.length
      ? await admin.from("ai_resource_analyses").select("file_id").or(clauses).limit(200)
      : { data: [] as Array<{ file_id: string }> };
    const fileIds = Array.from(new Set([...(lexicalAnalyses ?? []).map((row) => row.file_id), ...semanticIds])).filter(Boolean);
    if (!fileIds.length) {
      const response = await composeReply({ language: intent.language, query: lastMessage, state, results: [], courseSuggestions: [], fallbackCount: 0, requestAvailable: true });
      return NextResponse.json({ intent, searchState: state, results: [], courseSuggestions: [], total: 0, response, userAuthenticated: Boolean(user), requestHref: "/tools/resource-request" });
    }
    const { data: files } = await admin.from("files").select("id,course_id").eq("visibility", "published").in("id", fileIds).not("course_id", "is", null);
    const counts = new Map<string, number>();
    for (const row of files ?? []) if (row.course_id) counts.set(row.course_id, (counts.get(row.course_id) || 0) + 1);
    const courseIds = Array.from(counts.keys());
    const { data: courseRows } = courseIds.length
      ? await admin.from("courses").select("id,course_code,course_name,department_id").in("id", courseIds)
      : { data: [] as CourseRow[] };
    const courseSuggestions = (courseRows ?? []).map((row) => ({ ...row, matching_resources: counts.get(row.id) || 0 })).sort((a, b) => b.matching_resources - a.matching_resources || a.course_code.localeCompare(b.course_code)).slice(0, 12);
    const response = await composeReply({ language: intent.language, query: lastMessage, state, results: [], courseSuggestions, fallbackCount: 0, requestAvailable: courseSuggestions.length === 0 });
    return NextResponse.json({ intent, searchState: state, results: [], courseSuggestions, total: courseSuggestions.length, response, userAuthenticated: Boolean(user), requestHref: courseSuggestions.length ? null : "/tools/resource-request" });
  }

  let query = admin.from("files").select(baseSelect).eq("visibility", "published").limit(100);
  if (course?.id) query = query.eq("course_id", course.id);
  if (state.year) query = query.eq("year", state.year);
  if (state.semester) query = query.eq("semester", state.semester);
  if (state.max_price_cents != null) query = query.lte("price_cents", state.max_price_cents);
  if (state.price_filter === "free") query = query.eq("pricing_type", "free");
  if (state.price_filter === "paid") query = query.eq("pricing_type", "paid");
  if (state.min_rating != null) query = query.gte("average_rating", state.min_rating);
  const { data: lexicalRows, error } = await query;
  if (error) return NextResponse.json({ error: "AI resource search failed." }, { status: 500 });
  const rows = (lexicalRows ?? []) as ResourceRow[];

  const scored = rows.map((row) => {
    const lexical = scoreLexical(row, terms);
    const semantic = semanticScores.get(row.id) || 0;
    const courseMatch = Boolean(course?.id && row.course_id === course.id);
    const topicRequested = state.topic_terms.length > 0 || state.resource_terms.length > 0;
    const topicMatch = !topicRequested || semantic >= 0.48 || lexical >= 0.34;
    const semanticComponent = semantic * 0.58;
    const lexicalComponent = lexical * 0.22;
    const courseComponent = courseMatch ? 0.20 : 0;
    const relevance = semanticComponent + lexicalComponent + courseComponent;
    return { row, lexical, semantic, courseMatch, topicMatch, relevance, popularity: scorePopularity(row) };
  });

  const exactMatches = scored.filter((item) => item.topicMatch && (!state.course_code || item.courseMatch));
  const hasTopicConstraint = state.topic_terms.length > 0 || state.resource_terms.length > 0 || terms.length > 0;
  const exactAvailable = exactMatches.filter((item) => !hasTopicConstraint || item.semantic >= 0.42 || item.lexical >= 0.24 || !state.topic_terms.length);
  let chosen = [...exactAvailable];
  let fallbackItems: typeof scored = [];

  if (!chosen.length && course?.id) {
    fallbackItems = scored.filter((item) => item.courseMatch);
  }
  if (!chosen.length && !course?.id && semanticScores.size) {
    fallbackItems = scored.filter((item) => item.semantic >= 0.40).sort((a, b) => b.semantic - a.semantic).slice(0, 12);
  }

  const sort = state.sort || "relevance";
  const sorter = (a: (typeof scored)[number], b: (typeof scored)[number]) => {
    if (sort === "popular") return b.popularity - a.popularity;
    if (sort === "most_downloaded") return Number(b.row.downloads_count || 0) - Number(a.row.downloads_count || 0) || b.relevance - a.relevance;
    if (sort === "best_rated") return Number(b.row.average_rating || 0) - Number(a.row.average_rating || 0) || Number(b.row.reviews_count || 0) - Number(a.row.reviews_count || 0);
    if (sort === "newest") return new Date(b.row.published_at || 0).getTime() - new Date(a.row.published_at || 0).getTime();
    if (sort === "cheapest") return Number(a.row.price_cents || 0) - Number(b.row.price_cents || 0) || b.relevance - a.relevance;
    return b.relevance - a.relevance || b.popularity - a.popularity;
  };
  chosen.sort(sorter);
  fallbackItems.sort(sorter);

  const selected = chosen.slice(0, 8);
  const fallbackSelected = selected.length ? [] : fallbackItems.slice(0, 6);
  const responseRows = selected.length ? selected : fallbackSelected;
  const responseCourseIds = Array.from(new Set(responseRows.map(({ row }) => row.course_id).filter(Boolean))) as string[];
  const sellerIds = Array.from(new Set(responseRows.map(({ row }) => row.seller_id).filter(Boolean))) as string[];
  const [{ data: courses }, { data: sellers }] = await Promise.all([
    responseCourseIds.length ? admin.from("courses").select("id,course_code,course_name,department_id").in("id", responseCourseIds) : Promise.resolve({ data: [] as CourseRow[] }),
    sellerIds.length ? admin.from("profiles").select("id,full_name").in("id", sellerIds) : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);
  const courseMap = new Map((courses ?? []).map((row) => [row.id, row]));
  const sellerMap = new Map((sellers ?? []).map((row) => [row.id, row.full_name]));
  const results = responseRows.map(({ row, semantic, relevance, lexical, popularity }) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    pricing_type: row.pricing_type,
    price_cents: row.price_cents,
    average_rating: row.average_rating,
    reviews_count: row.reviews_count,
    downloads_count: row.downloads_count,
    course_code: row.course_id ? courseMap.get(row.course_id)?.course_code ?? null : null,
    course_name: row.course_id ? courseMap.get(row.course_id)?.course_name ?? null : null,
    seller_name: row.seller_id ? sellerMap.get(row.seller_id) ?? null : null,
    semantic_score: Number(semantic.toFixed(3)),
    lexical_score: Number(lexical.toFixed(3)),
    match_relevance: Number(relevance.toFixed(3)),
    popularity_score: Number(popularity.toFixed(1)),
    fallback: selected.length === 0,
  }));

  const courseSuggestions: CourseSuggestion[] = [];
  const response = await composeReply({
    language: intent.language,
    query: lastMessage,
    state,
    results,
    courseSuggestions,
    fallbackCount: selected.length ? 0 : fallbackSelected.length,
    requestAvailable: results.length === 0,
  });

  return NextResponse.json({
    intent,
    searchState: state,
    results,
    courseSuggestions,
    total: results.length,
    exactCount: selected.length,
    fallbackCount: fallbackSelected.length,
    response,
    userAuthenticated: Boolean(user),
    requestHref: results.length ? null : "/tools/resource-request",
  });
}
