import { createClient } from "@/lib/supabase/server";

export type StudentTool = {
  id: string;
  slug: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  is_active: boolean;
  is_builtin: boolean;
  display_order: number;
  open_in_new_tab: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_STUDENT_TOOLS: StudentTool[] = [
  { id: "fallback-academic-calendar", slug: "academic-calendar", title: "Academic Calendar", description: "See the latest EWU academic calendar for your semester.", href: "/tools/academic-calendar", icon: "CalendarDays", is_active: true, is_builtin: true, display_order: 10, open_in_new_tab: false, created_by: null, created_at: "", updated_at: "" },
  { id: "fallback-final-exams", slug: "final-exams", title: "Final Exam Schedule", description: "Open the latest final exam schedule by Spring, Summer or Fall term.", href: "/tools/final-exams", icon: "ClipboardCheck", is_active: true, is_builtin: true, display_order: 20, open_in_new_tab: false, created_by: null, created_at: "", updated_at: "" },
  { id: "fallback-deadlines", slug: "deadlines", title: "Deadline Tracker", description: "Keep important academic and StudyHub deadlines in one place.", href: "/tools/deadlines", icon: "FileClock", is_active: true, is_builtin: true, display_order: 30, open_in_new_tab: false, created_by: null, created_at: "", updated_at: "" },
  { id: "fallback-resource-request", slug: "resource-request", title: "Request a Resource", description: "Ask the StudyHub community for a missing note, question bank or other resource.", href: "/tools/resource-request", icon: "FileQuestion", is_active: true, is_builtin: true, display_order: 40, open_in_new_tab: false, created_by: null, created_at: "", updated_at: "" },
];

export async function getActiveStudentTools() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("student_tool_catalog")
    .select("id,slug,title,description,href,icon,is_active,is_builtin,display_order,open_in_new_tab,created_by,created_at,updated_at")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return error || !data?.length ? DEFAULT_STUDENT_TOOLS : (data as StudentTool[]);
}
