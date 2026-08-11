"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RESOURCE_CATEGORIES } from "@/lib/constants";

interface DepartmentOption {
  id: string;
  name: string;
}

export function SearchFilters({
  departments,
  values,
}: {
  departments: DepartmentOption[];
  values: {
    q: string;
    courseCode: string;
    departmentId: string;
    pricing: string;
    sort: string;
    category: string;
  };
}) {
  return (
    <form action="/search" className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={values.q} placeholder="Search notes, courses, keywords…" className="h-11 pl-9" />
        </div>
        <Input name="courseCode" defaultValue={values.courseCode} placeholder="Course code e.g. CSE303" className="h-11" />
        <Button type="submit" size="lg" className="h-11">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>
        <select name="departmentId" defaultValue={values.departmentId} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </select>
        <select name="category" defaultValue={values.category} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All resource types</option>
          {RESOURCE_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="pricing" defaultValue={values.pricing} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Free & paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </select>
        <select name="sort" defaultValue={values.sort} className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:ml-auto">
          <option value="newest">Newest</option>
          <option value="popular">Most downloaded</option>
          <option value="trending">Trending</option>
          <option value="top_rated">Highest rated</option>
        </select>
      </div>
    </form>
  );
}
