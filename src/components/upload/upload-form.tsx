"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Search, Sparkles, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESOURCE_CATEGORIES, SEMESTERS } from "@/lib/constants";
import type { Department, Course } from "@/types/database.types";

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const CATEGORIES = RESOURCE_CATEGORIES;
const PRICE_PRESETS = [50, 100, 150, 200];
const MIN_PRICE = 10;
const MAX_PRICE = 1000;

type UploadDepartment = Pick<Department, "id" | "name" | "short_name">;
type UploadCourse = Pick<Course, "id" | "course_code" | "course_name" | "department_id">;
type SellerAIAnalysis = {
  group_type: "single" | "related_bundle" | "mixed_bundle";
  title: string; description: string; table_of_contents: string; course_code: string | null; department_short_name: string | null;
  category: string | null; semester: string | null; year: number | null; tags: string[]; topics: string[]; difficulty: string | null;
  reading_time_minutes: number | null; summary: string; confidence: number; group_conflicts: string[];
  file_breakdown: Array<{ file_name: string; role: string; summary: string; topics: string[]; suggested_sections: string[] }>;
  moderation_precheck: { flags: string[]; risk_score: number; rationale: string }; model?: string; analysis_version?: string;
};

export function UploadForm({
  departments,
  courses,
  allowAdmin = false,
}: {
  departments: UploadDepartment[];
  courses: UploadCourse[];
  allowAdmin?: boolean;
}) {
  const router = useRouter();
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const [priceTaka, setPriceTaka] = useState<number | "">(50);
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [semester, setSemester] = useState<string>("Spring");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const MAX_BATCH_FILES = 3;
  const [uploadStatuses, setUploadStatuses] = useState<Array<{ name: string; status: "queued" | "uploading" | "success" | "error"; message?: string }>>([]);
  const aiConsent = true;
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<SellerAIAnalysis | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiRetryAt, setAiRetryAt] = useState<number | null>(null);
  const [aiRetrySeconds, setAiRetrySeconds] = useState(0);
  const [sellerAIOverrides, setSellerAIOverrides] = useState<{ tags: string[]; topics: string[]; difficulty: string; reading_time_minutes: number | null }>({ tags: [], topics: [], difficulty: "", reading_time_minutes: null });
  const aiMixedBundle = aiAnalysis?.group_type === "mixed_bundle";

  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Courses available in the currently-selected department (Course dropdown stays in sync with Department)
  const coursesInDepartment = useMemo(
    () => courses.filter((c) => c.department_id === departmentId),
    [courses, departmentId]
  );

  // Course-code search across ALL departments — picking a result sets both Course and Department
  const searchResults = useMemo(() => {
    const q = normalize(courseQuery);
    if (!q) return [];
    return courses
      .filter((c) => normalize(c.course_code).includes(q) || c.course_name.toLowerCase().includes(courseQuery.toLowerCase()))
      .slice(0, 8);
  }, [courses, courseQuery]);

  // Exact course-code match: typing e.g. "CSE 103" immediately fills the
  // Department and Course fields so the seller does not have to pick them twice.
  const exactCourseMatch = useMemo(() => {
    const q = normalize(courseQuery);
    if (!q) return null;
    return courses.find((c) => normalize(c.course_code) === q) ?? null;
  }, [courses, courseQuery]);

  function handleCourseSearchChange(value: string) {
    setCourseQuery(value);
    setShowSuggestions(true);
    if (!value.trim()) {
      setCourseId("");
      setDepartmentId("");
      return;
    }
    const q = normalize(value);
    const exact = courses.find((c) => normalize(c.course_code) === q);
    if (exact) {
      setDepartmentId(exact.department_id);
      setCourseId(exact.id);
    } else if (courseId) {
      setCourseId("");
    }
  }

  function selectCourse(course: UploadCourse) {
    setDepartmentId(course.department_id);
    setCourseId(course.id);
    setCourseQuery(course.course_code);
    setShowSuggestions(false);
  }

  function handleDepartmentChange(newDeptId: string) {
    setDepartmentId(newDeptId);
    // If the currently selected course doesn't belong to the newly chosen department, clear it
    const current = courses.find((c) => c.id === courseId);
    if (current && current.department_id !== newDeptId) {
      setCourseId("");
      setCourseQuery("");
    }
  }

  function handleCourseChange(newCourseId: string) {
    setCourseId(newCourseId);
    const course = courses.find((c) => c.id === newCourseId);
    setCourseQuery(course ? course.course_code : "");
  }

  function isUnsupported(file: File) {
    return /\.(zip|rar|7z|mp4|mov|mkv|webm|avi|m4v|wmv)$/i.test(file.name) || /zip|compressed|^video\//i.test(file.type);
  }

  function updateFiles(next: File[]) {
    const deduped: File[] = [];
    for (const file of next) {
      if (!deduped.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) {
        deduped.push(file);
      }
    }
    if (deduped.some(isUnsupported)) {
      toast.error("Video and ZIP/archive files are not supported. Select PDF, PPT, PPTX, DOC, DOCX or image files.");
      return;
    }
    if (deduped.length > MAX_BATCH_FILES) {
      toast.error(`You can upload a maximum of ${MAX_BATCH_FILES} files at once.`);
      return;
    }
    setFiles(deduped);
    setUploadStatuses([]);
    setAiAnalysis(null);
    setSellerAIOverrides({ tags: [], topics: [], difficulty: "", reading_time_minutes: null });
    setAiError("");
  }

  useEffect(() => {
    if (!aiRetryAt) {
      setAiRetrySeconds(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((aiRetryAt - Date.now()) / 1000));
      setAiRetrySeconds(remaining);
      if (remaining === 0) setAiRetryAt(null);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [aiRetryAt]);

  async function suggestWithAi(selectedFiles: File[]) {
    if (!selectedFiles.length || aiRetrySeconds > 0) return;
    setAiAnalyzing(true);
    setAiError("");
    try {
      const form = new FormData();
      selectedFiles.forEach((file) => form.append("files", file));
      form.set("aiConsent", "true");
      const response = await fetch("/api/ai/resource-suggest", { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok) {
        const retryAfter = Number(json.retryAfterSeconds || response.headers.get("Retry-After") || 0);
        if (json.retryable && retryAfter > 0) setAiRetryAt(Date.now() + Math.min(30000, retryAfter * 1000));
        throw new Error(json.error || "AI suggestion failed.");
      }
      setAiAnalysis(json);
      setSellerAIOverrides({
        tags: Array.isArray(json.tags) ? json.tags.filter((x: unknown): x is string => typeof x === "string").slice(0, 30) : [],
        topics: Array.isArray(json.topics) ? json.topics.filter((x: unknown): x is string => typeof x === "string").slice(0, 40) : [],
        difficulty: typeof json.difficulty === "string" ? json.difficulty : "",
        reading_time_minutes: typeof json.reading_time_minutes === "number" ? json.reading_time_minutes : null,
      });
      if (json.title) {
        const title = document.getElementById("title") as HTMLInputElement | null;
        if (title) title.value = json.title;
      }
      if (json.description) {
        const description = document.getElementById("description") as HTMLTextAreaElement | null;
        if (description) description.value = json.description;
      }
      if (json.table_of_contents) {
        const toc = document.getElementById("tableOfContents") as HTMLTextAreaElement | null;
        if (toc) toc.value = json.table_of_contents;
      }
      if (json.category && CATEGORIES.some(([value]) => value === json.category)) {
        const category = document.getElementById("category") as HTMLSelectElement | null;
        if (category) category.value = json.category;
      }
      if (json.year) setYear(String(json.year));
      if (json.semester && SEMESTERS.includes(json.semester)) setSemester(json.semester);
      if (json.course_code) {
        const matched = courses.find((course) => normalize(course.course_code) === normalize(json.course_code));
        if (matched) {
          setDepartmentId(matched.department_id);
          setCourseId(matched.id);
          setCourseQuery(matched.course_code);
        }
      }
      setAiRetryAt(null);
      toast.success(json.cached ? "AI suggestions loaded from your previous analysis." : "AI analyzed the resource. Please review the suggested fields before submitting.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI suggestion failed.";
      setAiError(message);
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files.length) {
      toast.error("Please select at least one file to upload.");
      return;
    }
    if (files.length > MAX_BATCH_FILES) {
      toast.error(`You can upload a maximum of ${MAX_BATCH_FILES} files at once.`);
      return;
    }
    if (pricingType === "paid") {
      const p = Number(priceTaka);
      if (!p || p < MIN_PRICE || p > MAX_PRICE) {
        toast.error(`Price must be between ৳${MIN_PRICE} and ৳${MAX_PRICE}.`);
        return;
      }
    }

    setSubmitting(true);
    setUploadStatuses(files.map((f) => ({ name: f.name, status: "queued" as const })));
    try {
      const baseForm = new FormData(e.currentTarget);
      for (const selectedFile of files) baseForm.append("files", selectedFile);
      baseForm.delete("file");
      baseForm.set("pricingType", pricingType);
      baseForm.set("priceCents", pricingType === "paid" ? String(Math.round(Number(priceTaka) * 100)) : "0");
      baseForm.set("semester", semester);
      baseForm.set("year", year);
      baseForm.set("adminUpload", allowAdmin ? "true" : "false");
      baseForm.set("aiConsent", "true");
      if (aiAnalysis) baseForm.set("aiAnalysis", JSON.stringify(aiAnalysis));
      if (aiAnalysis) baseForm.set("aiFinalMetadata", JSON.stringify(sellerAIOverrides));
      setUploadStatuses(files.map((f) => ({ name: f.name, status: "uploading" as const })));
      const res = await fetch("/api/files/upload", { method: "POST", body: baseForm });
      const json = await res.json();
      if (!res.ok) {
        setUploadStatuses(files.map((f) => ({ name: f.name, status: "error" as const, message: json.error ?? "Upload failed" })));
        throw new Error(json.error ?? "Upload failed");
      }
      setUploadStatuses(files.map((f) => ({ name: f.name, status: "success" as const, message: "Submitted" })));
      if (!aiAnalysis && Array.isArray(json.ids) && json.ids.length) {
        const aiForm = JSON.stringify({ fileIds: json.ids });
        void fetch("/api/ai/system-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: aiForm, keepalive: true }).catch(() => undefined);
      }
      toast.success(files.length > 1 ? `${files.length} files were grouped into one resource and submitted for review.` : "Resource submitted for review.");
      router.push(`/notifications`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border bg-card p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Selected files</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} ready` : "Select 1–3 files first"}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!files.length || aiAnalyzing || aiRetrySeconds > 0}
            onClick={() => void suggestWithAi(files)}
          >
            {aiAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI analyzing…</> : aiRetrySeconds > 0 ? <>Try again in {aiRetrySeconds}s</> : <><Sparkles className="mr-2 h-4 w-4" />AI Autofill</>}
          </Button>
        </div>
        {aiAnalysis && !aiAnalyzing && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border px-2 py-1">{aiAnalysis.group_type === "single" ? "Single file" : aiAnalysis.group_type === "related_bundle" ? "Related bundle" : "Mixed files"}</span>
          {aiAnalysis.confidence != null && <span>Confidence {Math.round(Number(aiAnalysis.confidence) * 100)}%</span>}
          {aiAnalysis.group_conflicts?.length ? <span>{aiAnalysis.group_conflicts.length} warning{aiAnalysis.group_conflicts.length === 1 ? "" : "s"}</span> : null}
        </div>}
        {aiError && <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">{aiError}</div>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required minLength={5} maxLength={150} placeholder="e.g. CSE303 Final Exam Notes — Complete" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="What's inside, which topics are covered, any tips for buyers…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tableOfContents">What’s inside / Table of contents <span className="text-muted-foreground">(optional)</span></Label>
        <textarea id="tableOfContents" name="tableOfContents" maxLength={3000} rows={6} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={"Example:\n1. Introduction\n2. Database Fundamentals\n3. ER Model\n4. Normalization\n5. SQL Queries"} />
        <p className="text-xs text-muted-foreground">Add the main topics, chapters or questions covered so buyers can quickly understand what they are getting.</p>
      </div>

      {aiAnalysis && (
        <div className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm font-semibold">AI metadata review</p>
            <p className="mt-1 text-xs text-muted-foreground">AI suggestions are editable. Your edited topics, tags and study details are saved as your final seller metadata while the original AI analysis is preserved separately.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiTopics">Topics</Label>
            <Input id="aiTopics" value={sellerAIOverrides.topics.join(", ")} onChange={(e) => setSellerAIOverrides((current) => ({ ...current, topics: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40) }))} placeholder="recursion, tree traversal, stack" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiTags">Tags</Label>
            <Input id="aiTags" value={sellerAIOverrides.tags.join(", ")} onChange={(e) => setSellerAIOverrides((current) => ({ ...current, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30) }))} placeholder="exam, lecture, revision" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiDifficulty">Difficulty</Label>
            <Input id="aiDifficulty" value={sellerAIOverrides.difficulty} onChange={(e) => setSellerAIOverrides((current) => ({ ...current, difficulty: e.target.value.slice(0, 60) }))} placeholder="Beginner / Intermediate / Advanced" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiReadingTime">Estimated study time (minutes)</Label>
            <Input id="aiReadingTime" type="number" min={1} max={600} value={sellerAIOverrides.reading_time_minutes ?? ""} onChange={(e) => setSellerAIOverrides((current) => ({ ...current, reading_time_minutes: e.target.value ? Math.max(1, Math.min(600, Number(e.target.value))) : null }))} placeholder="60" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <select id="category" name="category" required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Course-code search — picking a result sets both Course and Department below */}
      <div className="relative space-y-2">
        <Label htmlFor="courseSearch">Find your course</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="courseSearch"
            placeholder="Type a course code, e.g. CSE303…"
            className="pl-9 pr-9"
            value={courseQuery}
            onChange={(e) => handleCourseSearchChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {courseQuery && (
            <button
              type="button"
              aria-label="Clear course"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setCourseQuery("");
                setCourseId("");
                setDepartmentId("");
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {exactCourseMatch && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs sm:text-sm">
            <span className="font-semibold text-primary">Auto-selected:</span>
            <span className="min-w-0 break-words text-muted-foreground">{exactCourseMatch.course_code} — {exactCourseMatch.course_name}</span>
          </div>
        )}
        {showSuggestions && searchResults.length > 0 && (
          <ul className="absolute z-10 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {searchResults.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCourse(c)}
                >
                  <span className="font-medium">{c.course_code}</span>
                  <span className="text-xs text-muted-foreground">{c.course_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department {aiMixedBundle ? <span className="text-muted-foreground">(optional for mixed bundle)</span> : null}</Label>
          <select
            id="departmentId"
            name="departmentId"
            value={departmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{aiMixedBundle ? "Not applicable / mixed bundle" : "Select department"}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseId">Course {aiMixedBundle ? <span className="text-muted-foreground">(optional for mixed bundle)</span> : null}</Label>
          <select
            id="courseId"
            name="courseId"
            required={!aiMixedBundle}
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!departmentId && !aiMixedBundle}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="" disabled>{aiMixedBundle ? "No single course — mixed bundle" : departmentId ? "Select course" : "Select department first"}</option>
            {coursesInDepartment.map((c) => (
              <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Year -> Semester */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yearSelect">Year</Label>
          <select
            id="yearSelect"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="semesterSelect">Semester</Label>
          <select
            id="semesterSelect"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s} {year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pricing</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPricingType("free")}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${pricingType === "free" ? "border-primary bg-accent text-accent-foreground" : ""}`}
          >
            Free
          </button>
          <button
            type="button"
            onClick={() => setPricingType("paid")}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium ${pricingType === "paid" ? "border-primary bg-accent text-accent-foreground" : ""}`}
          >
            Paid
          </button>
        </div>

        {pricingType === "paid" && (
          <div className="pt-2 space-y-2">
            <Label>Price (৳)</Label>
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setIsCustomPrice(false);
                    setPriceTaka(p);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    !isCustomPrice && priceTaka === p ? "border-primary bg-accent text-accent-foreground" : ""
                  }`}
                >
                  ৳{p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustomPrice(true);
                  setPriceTaka("");
                }}
                className={`rounded-md border px-3 py-1.5 text-sm ${isCustomPrice ? "border-primary bg-accent text-accent-foreground" : ""}`}
              >
                Custom
              </button>
            </div>

            {isCustomPrice && (
              <Input
                type="number"
                min={MIN_PRICE}
                max={MAX_PRICE}
                placeholder={`Enter amount (৳${MIN_PRICE}–৳${MAX_PRICE})`}
                value={priceTaka}
                onChange={(e) => setPriceTaka(e.target.value === "" ? "" : Number(e.target.value))}
              />
            )}

            <p className="text-xs text-muted-foreground">
              You set the seller price. EWU StudyHub adds a separate platform fee on top for the buyer; your seller price is not reduced.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="file">Files</Label>
          <span className="text-xs font-semibold text-muted-foreground">{files.length}/{MAX_BATCH_FILES} selected</span>
        </div>
        <div className="rounded-2xl border border-dashed p-4 sm:p-5">
          <div className="flex flex-col items-center justify-center text-center">
            <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{files.length ? "Selected files" : "Select files for one resource"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_BATCH_FILES} files • 100MB each • ZIP/archives are not allowed</p>
            <label htmlFor="file" className="mt-3 inline-flex cursor-pointer items-center rounded-lg border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
              {files.length ? "Add / change files" : "Choose files"}
            </label>
          </div>
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file) => (
                <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{file.type || "File"} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button type="button" onClick={() => { setFiles((current) => current.filter((item) => item !== file)); setAiAnalysis(null); setAiError(""); }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Remove ${file.name}`}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <input
          id="file"
          type="file"
          className="hidden"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
          multiple
          onChange={(e) => {
            const next = Array.from(e.target.files ?? []);
            updateFiles([...files, ...next]);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? `Uploading ${uploadStatuses.filter((x) => x.status === "success").length}/${files.length}…` : "Submit for review"}
      </Button>
    </form>
  );
}
