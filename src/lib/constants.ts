import type { ResourceCategory } from "@/types/database.types";

export const RESOURCE_CATEGORIES: readonly [ResourceCategory, string][] = [
  ["notes", "Notes"],
  ["quiz_questions", "Quiz Questions"],
  ["mid_questions", "Mid Questions"],
  ["final_questions", "Final Questions"],
  ["assignment", "Assignment"],
  ["lab_report", "Lab Report"],
  ["project", "Project"],
  ["presentation_slide", "Presentation Slides"],
  ["research_report", "Research Report"],
];

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = Object.fromEntries(
  RESOURCE_CATEGORIES
) as Record<ResourceCategory, string>;

export const SEMESTERS = ["Spring", "Summer", "Fall"] as const;

/** Upload guardrails shared by client UI, server validation, and Admin/User Guide content. */
export const MAX_UPLOAD_BATCH_FILES = 3;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024);
