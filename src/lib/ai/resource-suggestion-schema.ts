// Shared AI resource-suggestion schema + type, used by both the seller-facing
// resource-suggest route and the system-analysis route.
//
// This lives outside any route.ts file on purpose: Next.js App Router route
// files may only export route handlers (GET/POST/etc.) and a small set of
// route config values (config, dynamic, revalidate, ...). Any other named
// export from a route.ts file can fail Next's generated route type-checking
// (`.next/types/.../route.ts`) depending on the Next.js patch version, even
// though it may not surface in every build environment.

export const resourceSuggestionSchema = {
  type: "object",
  properties: {
    group_type: { type: "string", enum: ["single", "related_bundle", "mixed_bundle"] },
    title: { type: "string", description: "A useful marketplace title that never stays blank." },
    description: { type: "string", description: "A concise buyer-facing description that never stays blank." },
    table_of_contents: { type: "string", description: "A concise TOC; for multiple files, organize sections by file." },
    course_code: { type: ["string", "null"] },
    department_short_name: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    semester: { type: ["string", "null"] },
    year: { type: ["integer", "null"] },
    tags: { type: "array", items: { type: "string" } },
    topics: { type: "array", items: { type: "string" } },
    difficulty: { type: ["string", "null"] },
    reading_time_minutes: { type: ["integer", "null"] },
    summary: { type: "string" },
    confidence: { type: "number" },
    group_conflicts: { type: "array", items: { type: "string" } },
    file_breakdown: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file_name: { type: "string" },
          role: { type: "string" },
          summary: { type: "string" },
          topics: { type: "array", items: { type: "string" } },
          suggested_sections: { type: "array", items: { type: "string" } },
        },
        required: ["file_name", "role", "summary", "topics", "suggested_sections"],
      },
    },
    moderation_precheck: {
      type: "object",
      properties: {
        flags: { type: "array", items: { type: "string" } },
        risk_score: { type: "number" },
        rationale: { type: "string" },
      },
      required: ["flags", "risk_score", "rationale"],
    },
  },
  required: [
    "group_type", "title", "description", "table_of_contents", "course_code", "department_short_name",
    "category", "semester", "year", "tags", "topics", "difficulty", "reading_time_minutes", "summary",
    "confidence", "group_conflicts", "file_breakdown", "moderation_precheck",
  ],
};

export type FileBreakdown = {
  file_name: string;
  role: string;
  summary: string;
  topics: string[];
  suggested_sections: string[];
};

export interface ResourceSuggestion {
  group_type: "single" | "related_bundle" | "mixed_bundle";
  title: string;
  description: string;
  table_of_contents: string;
  course_code: string | null;
  department_short_name: string | null;
  category: string | null;
  semester: string | null;
  year: number | null;
  tags: string[];
  topics: string[];
  difficulty: string | null;
  reading_time_minutes: number | null;
  summary: string;
  confidence: number;
  group_conflicts: string[];
  file_breakdown: FileBreakdown[];
  moderation_precheck: { flags: string[]; risk_score: number; rationale: string };
}
