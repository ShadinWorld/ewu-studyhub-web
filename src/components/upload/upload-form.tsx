"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, UploadCloud, X } from "lucide-react";
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

export function UploadForm({
  departments,
  courses,
}: {
  departments: UploadDepartment[];
  courses: UploadCourse[];
}) {
  const router = useRouter();
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const [priceTaka, setPriceTaka] = useState<number | "">(50);
  const [isCustomPrice, setIsCustomPrice] = useState(false);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [semester, setSemester] = useState<string>("Spring");
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to upload.");
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
    const formData = new FormData(e.currentTarget);
    formData.set("file", file);
    formData.set("pricingType", pricingType);
    formData.set("priceCents", pricingType === "paid" ? String(Math.round(Number(priceTaka) * 100)) : "0");
    formData.set("semester", semester);
    formData.set("year", year);

    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      toast.success("Uploaded! Your file is pending review before it goes live.");
      router.push(`/notifications`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <Label htmlFor="departmentId">Department</Label>
          <select
            id="departmentId"
            name="departmentId"
            value={departmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="courseId">Course</Label>
          <select
            id="courseId"
            name="courseId"
            required
            value={courseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!departmentId}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
          >
            <option value="" disabled>{departmentId ? "Select course" : "Select department first"}</option>
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
              You'll receive 80% of each sale (min ৳{MIN_PRICE}, max ৳{MAX_PRICE}). EWU StudyHub takes a 20% platform commission.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed py-10 text-center hover:bg-accent/50"
        >
          <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{file ? file.name : "Click to select PDF, PPT, DOCX, ZIP, or image"}</span>
          <span className="text-xs text-muted-foreground">Max 100MB</span>
        </label>
        <input
          id="file"
          type="file"
          className="hidden"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.zip,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Uploading…" : "Submit for review"}
      </Button>
    </form>
  );
}
