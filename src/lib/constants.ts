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
